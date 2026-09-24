import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fonts } from '../../theme';
import { useLearners } from '../learners/LearnersProvider';
import { elapsedSeconds, formatDuration, type StoredSession } from './model';
import { usePractice } from './PracticeProvider';
import { SessionReviewContent } from './SessionReview';
import { listSessions } from './store';
import { fetchPracticeHistory } from './sync';

function Header({ title }: { title: string }) {
  return <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.back}
      onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}><AppIcon name="back" /></Pressable>
    <Text style={styles.title}>{title}</Text>
  </View>;
}
export function PracticeHistoryScreen() {
  const { learnerId } = useLocalSearchParams<{ learnerId: string }>();
  const { learners } = useLearners();
  const learner = learners.find(item => item.id === learnerId);
  const { version, sync } = usePractice();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (next = 0) => {
    if (!learner) return;
    setRefreshing(true); setError(null);
    try { await sync(); setMore(await fetchPracticeHistory(learner.account_id, learner.id, next)); setOffset(next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not refresh history.'); }
    finally { setRefreshing(false); }
  }, [learner, sync]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    let mounted = true;
    if (learner) void listSessions(learner.account_id, learner.id).then(rows => {
      if (mounted) setSessions(rows.filter(row => row.session.status === 'finished'));
    });
    return () => { mounted = false; };
  }, [learner, version]);
  return <SafeAreaView style={styles.screen}>
    <Header title="Practice history" />
    {!learner ? <Text style={styles.empty}>Choose a learner from Home.</Text> : <FlatList data={sessions} keyExtractor={row => row.session.id}
      contentContainerStyle={styles.content} refreshing={refreshing} onRefresh={() => void load()}
      ListHeaderComponent={<View style={styles.listHeader}><Text style={styles.learner}>{learner.name}</Text>
        <Text style={styles.body}>Most recent sessions first</Text>{error && <Text style={styles.error}>{error}</Text>}</View>}
      ListEmptyComponent={<View style={styles.emptyCard}><AppIcon name="route" size={45} color={colors.accentInk} />
        <Text style={styles.learner}>Your drives will appear here</Text><Text style={styles.body}>Finish a practice session to see the recording and review.</Text></View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" style={styles.session}
        onPress={() => router.push({ pathname: '/learners/[learnerId]/practice/[sessionId]', params: { learnerId: learner.id, sessionId: item.session.id } })}>
        <View style={styles.sessionTop}><View style={styles.icon}><AppIcon name="route" size={23} color={colors.accentInk} /></View>
          <View style={styles.flex}><Text style={styles.sessionDate}>{new Date(item.session.ended_at!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={styles.small}>{new Date(item.session.ended_at!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {item.session.route.mode === 'generated' ? 'Generated loop' : 'Practice recording'}</Text></View>
          <AppIcon name="chevronRight" size={20} color={colors.muted} /></View>
        <View style={styles.statRow}><Text style={styles.body}>{formatDuration(elapsedSeconds(item.session))} elapsed</Text>
          <Text style={styles.body}>{(item.session.metrics.distanceMeters / 1000).toFixed(1)} km</Text></View>
        <Text style={styles.small}>{formatDuration(item.session.metrics.movingSeconds)} moving · {item.session.reviewed_at ? 'Reviewed' : 'Review pending'}
          {item.dirty && learner.account_id !== 'local-demo' ? ' · Upload pending' : ''}{item.session.interrupted ? ' · Interrupted' : ''}</Text>
      </Pressable>}
      ListFooterComponent={more ? <PrimaryButton label="Load more" fullWidth loading={refreshing} onPress={() => void load(offset + 30)} /> : null} />}
  </SafeAreaView>;
}
export function PracticeDetailScreen() {
  const { learnerId, sessionId } = useLocalSearchParams<{ learnerId: string; sessionId: string }>();
  const { learners } = useLearners();
  const learner = learners.find(item => item.id === learnerId);
  return <SafeAreaView style={styles.screen}>
    <Header title="Practice results" />
    <ScrollView contentContainerStyle={styles.detail}>{learner && sessionId
      ? <SessionReviewContent key={sessionId} sessionId={sessionId} learner={learner}
        onClose={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/learners/[learnerId]/practice', params: { learnerId } })} />
      : <Text style={styles.empty}>This learner is unavailable.</Text>}</ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  header: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  back: { padding: 12 }, title: { fontFamily: fonts.medium, fontSize: 26, color: colors.ink },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 20, gap: 14, paddingBottom: 35 },
  detail: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, gap: 18, paddingBottom: 35 },
  listHeader: { gap: 8, marginBottom: 8 }, learner: { fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted }, small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  empty: { padding: 24, fontFamily: fonts.regular, color: colors.muted, fontSize: 17 },
  emptyCard: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 20, gap: 18 },
  session: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 13 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, icon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  sessionDate: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink }, statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  error: { fontFamily: fonts.regular, fontSize: 14, color: colors.error },
});
