import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme';
import { useLearners } from '../learners/LearnersProvider';
import type { StoredSession } from './model';
import { usePracticeCoachingTips } from './usePracticeCoachingTips';
import { PracticeDashboard } from './PracticeDashboard';
import { usePractice } from './PracticeProvider';
import { resumePractice, stopPractice } from './runtime';
import { SessionReviewSheet } from './SessionReview';
import { getActiveSession } from './store';

function OngoingPractice({ record, onStopping, onStopped }: { record: StoredSession; onStopping: (record: StoredSession) => void; onStopped: (id: string) => void }) {
  const { session } = record;
  const { learners } = useLearners();
  // Resolve tips for the recorded learner, even if the Home selection changes.
  const learner = learners.find(item => item.id === session.learner_id && item.account_id === session.account_id);
  const tips = usePracticeCoachingTips(learner);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function stop() {
    if (stopping) return;
    setStopping(true); setError(null);
    onStopping(record);
    try { await stopPractice(session.id); onStopped(session.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not stop. Please try again.'); }
    finally { setStopping(false); }
  }
  return <PracticeDashboard
    session={session}
    tips={tips}
    stopping={stopping}
    onStop={() => void stop()}
    notice={error ? <Text accessibilityRole="alert" numberOfLines={2} style={styles.error}>{error}</Text>
      : session.tracking_error ? <Pressable accessibilityRole="button" accessibilityLabel="Retry GPS tracking"
        onPress={() => void resumePractice(session.id).then(() => setError(null)).catch(cause => setError(cause.message))}>
        <Text numberOfLines={2} style={styles.error}>{session.tracking_error} Tap to retry tracking.</Text>
      </Pressable> : null}
  />;
}
export function PracticeScreen() {
  const { selectedLearner, learners, loading } = useLearners();
  const { active, sync } = usePractice();
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const [stoppingRecord, setStoppingRecord] = useState<StoredSession | null>(null);
  useFocusEffect(useCallback(() => {
    if (finishedId) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => listener.remove();
  }, [finishedId]));
  useFocusEffect(useCallback(() => {
    let current = true;
    if (loading || finishedId || stoppingRecord) return;
    void (async () => {
      const running = await getActiveSession();
      if (running && running.session.account_id === selectedLearner?.account_id) return;
      if (current) router.replace('/home');
    })().catch(() => { if (current) router.replace('/home'); });
    return () => { current = false; };
  }, [loading, selectedLearner?.account_id, finishedId, stoppingRecord]));
  const learner = learners.find(item => item.id === (stoppingRecord?.session.learner_id ?? active?.session.learner_id ?? selectedLearner?.id));
  const finish = (id: string) => { setFinishedId(id); void sync(); };
  const close = () => { setFinishedId(null); setStoppingRecord(null); router.dismissTo('/home'); };
  const ongoing = active ?? (!finishedId ? stoppingRecord : null);
  return <>
    {ongoing ? <OngoingPractice record={ongoing} onStopping={setStoppingRecord} onStopped={finish} />
      : <View style={styles.screen} />}
    {finishedId && learner && <SessionReviewSheet sessionId={finishedId} learner={learner} onClose={close} />}
  </>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  error: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.error },
});
