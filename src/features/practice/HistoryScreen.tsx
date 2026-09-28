import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fonts } from '../../theme';
import { useLearners } from '../learners/LearnersProvider';
import { LearnerSwitcher } from '../learners/LearnerSwitcher';
import type { Learner } from '../learners/model';
import { practiceBadges } from './badges';
import { filterPracticeHistory, resolvePracticeHistoryFilter, type PracticeHistoryFilter } from './history';
import type { StoredSession } from './model';
import { usePractice } from './PracticeProvider';
import { PracticeSessionCard } from './PracticeSessionCard';
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
  const { learnerId, badge, filter: legacyFilter } = useLocalSearchParams<{ learnerId: string; badge?: string; filter?: string }>();
  const filter = resolvePracticeHistoryFilter(badge, legacyFilter);
  const { learners } = useLearners();
  const learner = learners.find(item => item.id === learnerId);
  // Reset cached rows and pagination when switching learners, keeping the chosen filter.
  return <PracticeSessions key={`${learner?.account_id}:${learnerId}`} learner={learner} filter={filter} />;
}

function PracticeSessions({ learner, filter }: { learner: Learner | undefined; filter: PracticeHistoryFilter }) {
  const { version, sync } = usePractice();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState<'background' | 'refresh' | 'more' | null>(null);
  const [more, setMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const request = useRef(0);
  const visibleSessions = useMemo(() => filterPracticeHistory(sessions, filter), [sessions, filter]);
  const load = useCallback(async (next = 0, trigger: 'background' | 'refresh' | 'more' = 'background') => {
    if (!learner) return;
    const current = ++request.current;
    setLoading(trigger); setError(null);
    if (next === 0) { setMore(false); setOffset(0); }
    try {
      await sync();
      if (current !== request.current) return;
      const hasMore = await fetchPracticeHistory(learner.account_id, learner.id, next, filter);
      if (current === request.current) { setMore(hasMore); setOffset(next); }
    }
    catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : 'Could not refresh history.');
    }
    finally { if (current === request.current) setLoading(null); }
  }, [learner, sync, filter]);
  useFocusEffect(useCallback(() => {
    // Refocus updates cached rows without starting the native pull-to-refresh animation.
    void load();
    // A response for the previous filter must not overwrite this filter's pagination.
    return () => { request.current++; setLoading(null); };
  }, [load]));
  useFocusEffect(useCallback(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []));
  useEffect(() => {
    let mounted = true;
    if (learner) void listSessions(learner.account_id, learner.id).then(rows => {
      if (mounted) setSessions(rows.filter(row => row.session.status === 'finished'));
    });
    return () => { mounted = false; };
  }, [learner, version]);
  return <SafeAreaView style={styles.screen}>
    <Header title="Practice Sessions" />
    {!learner ? <Text style={styles.empty}>Choose a learner from Home.</Text> : <FlatList data={visibleSessions} keyExtractor={row => row.session.id}
      initialNumToRender={4} maxToRenderPerBatch={4} windowSize={5}
      contentContainerStyle={styles.content} refreshing={loading === 'refresh'} onRefresh={() => void load(0, 'refresh')}
      ListHeaderComponent={<View style={styles.listHeader}>
        <LearnerSwitcher compact allowAdd={false} learnerId={learner.id}
          onSelect={learnerId => {
            if (learnerId !== learner.id) router.setParams({ learnerId });
          }} />
        <View style={styles.filters}>
          {practiceBadges.map(badge => (
            <Pressable key={badge.id} accessibilityRole="checkbox" accessibilityLabel={badge.label}
              accessibilityState={{ checked: filter === badge.id }}
              accessibilityHint={filter === badge.id ? 'Remove this filter to show all sessions' : `Show sessions with the ${badge.label} badge`}
              onPress={() => router.setParams({ badge: filter === badge.id ? '' : badge.id, filter: '' })}
              style={({ pressed }) => [styles.filter,
                { backgroundColor: badge.backgroundColor, borderColor: filter === badge.id ? badge.color : 'transparent' },
                pressed && styles.pressed]}>
              <View aria-hidden><AppIcon name={badge.icon} size={16} color={badge.color} /></View>
              <Text style={[styles.filterLabel, { color: badge.color }]}>{badge.label}</Text>
              {filter === badge.id && <View aria-hidden><AppIcon name="check" size={16} color={badge.color} /></View>}
            </Pressable>
          ))}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}</View>}
      ListEmptyComponent={<View style={styles.emptyCard}><AppIcon name={filter === 'night_drive' ? 'moon' : 'route'} size={45} color={colors.accentInk} />
        <Text style={styles.learner}>{loading ? 'Loading sessions…' : filter ? 'No sessions with this badge' : 'No sessions recorded'}</Text></View>}
      renderItem={({ item }) => <PracticeSessionCard record={item} now={now} />}
      ListFooterComponent={more ? <PrimaryButton label="Load more" fullWidth loading={loading === 'more'} disabled={loading !== null}
        onPress={() => void load(offset + 30, 'more')} /> : null} />}
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
  screen: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 4 },
  back: { padding: 12 }, title: { fontFamily: fonts.medium, fontSize: 26, color: colors.ink },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 20, gap: 14, paddingBottom: 35 },
  detail: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 22, gap: 18, paddingBottom: 35 },
  listHeader: { gap: 8, marginBottom: 8 }, learner: { fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filter: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterLabel: { fontFamily: fonts.medium, fontSize: 15 },
  pressed: { opacity: 0.7 },
  empty: { padding: 24, fontFamily: fonts.regular, color: colors.muted, fontSize: 17 },
  emptyCard: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 20, gap: 18 },
  error: { fontFamily: fonts.regular, fontSize: 14, color: colors.error },
});
