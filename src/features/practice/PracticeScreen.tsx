import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { useLearners } from '../learners/LearnersProvider';
import { LearnerIdentity } from './LearnerIdentity';
import { appleMapsUrl, elapsedSeconds, eventCounts, formatDuration, gapSeconds, type PracticeEvent, type StoredSession } from './model';
import { usePractice } from './PracticeProvider';
import { resumePractice, stopPractice } from './runtime';
import { SessionReviewSheet } from './SessionReview';
import { getActiveSession, readEvents } from './store';

function OngoingPractice({ record, onStopping, onStopped }: { record: StoredSession; onStopping: (record: StoredSession) => void; onStopped: (id: string) => void }) {
  const { session } = record;
  const { version } = usePractice();
  const { height } = useWindowDimensions();
  const compact = height < 740;
  const [now, setNow] = useState(() => Date.now());
  const [events, setEvents] = useState<PracticeEvent[]>([]);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { let mounted = true; void readEvents(session.id).then(items => { if (mounted) setEvents(items); }); return () => { mounted = false; }; }, [session.id, version]);
  const counts = eventCounts(events);
  const metrics = session.metrics;
  const recent = metrics.lastPoint && now - metrics.lastPoint.timestamp < 20000;
  const speed = recent && metrics.currentSpeed !== null ? (metrics.currentSpeed * 3.6).toFixed(0) : '—';
  const average = metrics.movingSeconds ? (metrics.distanceMeters / metrics.movingSeconds * 3.6).toFixed(0) : '—';
  const rows = [
    ['Elapsed time', formatDuration(elapsedSeconds(session, now))],
    ['Moving · stopped', formatDuration(metrics.movingSeconds) + ' · ' + formatDuration(metrics.stoppedSeconds)],
    ['Speed · distance', speed + ' km/h · ' + (metrics.distanceMeters / 1000).toFixed(2) + ' km'],
    ['Average · maximum', average + ' · ' + (metrics.maxSpeed * 3.6).toFixed(0) + ' km/h'],
    ['Turns · roundabouts · stops', (counts.left_turn + counts.right_turn) + ' · ' + counts.roundabout + ' · ' + counts.stop],
    ['GPS · saved data', (recent ? '±' + Math.round(metrics.lastPoint!.accuracy!) + ' m' : 'Waiting for GPS')
      + ' · ' + (record.dirty ? 'On device' : 'Synced')],
  ];
  async function stop() {
    if (stopping) return;
    setStopping(true); setError(null);
    onStopping(record);
    try { await stopPractice(session.id); onStopped(session.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not stop. Please try again.'); }
    finally { setStopping(false); }
  }
  return <SafeAreaView style={styles.screen}>
    <View style={styles.progressTrack} />
    <View style={[styles.ongoing, compact && styles.compact]}>
      <View style={styles.liveHeader}><View style={styles.liveDot} /><Text style={styles.liveLabel}>PRACTICE IN PROGRESS</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Apple Maps" style={styles.mapLink}
          onPress={() => void Linking.openURL(appleMapsUrl(session.route)).catch(() => setError('Apple Maps could not open.'))}>
          <AppIcon name="externalLink" size={19} color={colors.accentInk} />
        </Pressable></View>
      <LearnerIdentity id={session.learner_id} name={session.learner_name} />
      <View style={styles.table}>
        {rows.map(([label, value], index) => <View key={label} style={[styles.tableRow, index === 0 && styles.timerRow]}>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.rowLabel, compact && styles.compactLabel]}>{label}</Text>
          <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit
            style={[styles.rowValue, index === 0 && styles.timerValue, compact && styles.compactValue]}>{value}</Text>
        </View>)}
      </View>
      {error ? <Text numberOfLines={2} style={styles.error}>{error}</Text> : session.tracking_error ? <Pressable accessibilityRole="button" onPress={() => void resumePractice(session.id)
        .then(() => setError(null)).catch(cause => setError(cause.message))}>
        <Text numberOfLines={2} style={styles.error}>{session.tracking_error} Tap to retry tracking.</Text>
      </Pressable> : <Text numberOfLines={1} style={styles.small}>{gapSeconds(session, now) > 30 ? 'GPS gaps: ' + formatDuration(gapSeconds(session, now)) : 'Recording continues while Apple Maps is open.'}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel="Stop practice session" accessibilityState={{ disabled: stopping }}
        disabled={stopping} onPress={() => void stop()} style={[styles.stop, compact && styles.compactStop]}>
        <AppIcon name="stop" size={25} color={colors.surface} /><Text style={styles.stopText}>{stopping ? 'Stopping…' : 'Stop'}</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
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
  progressTrack: { height: 6, backgroundColor: colors.accentEdge },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  error: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.error },
  ongoing: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12, gap: 14 },
  compact: { paddingTop: 6, gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#43835B' },
  liveLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1, color: colors.muted }, mapLink: { padding: 10 },
  table: { flex: 1, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  tableRow: { flex: 1, minHeight: 0, paddingHorizontal: 16, justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  timerRow: { flex: 1.4, backgroundColor: colors.accentSoft, borderTopWidth: 0 },
  rowLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted }, rowValue: { fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  timerValue: { fontSize: 39, fontVariant: ['tabular-nums'], color: colors.accentInk },
  compactLabel: { fontSize: 10 }, compactValue: { fontSize: 20 },
  stop: { minHeight: 60, borderRadius: 20, backgroundColor: '#B9353F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  compactStop: { minHeight: 50 }, stopText: { fontFamily: fonts.medium, fontSize: 21, color: colors.surface },
});
