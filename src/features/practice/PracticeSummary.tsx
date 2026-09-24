import { useFocusEffect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../theme';
import type { Learner } from '../learners/model';
import { usePractice } from './PracticeProvider';
import { listSessions, pendingDiscards } from './store';

export function usePracticeTotals(learner: Learner) {
  const { version } = usePractice();
  const [totals, setTotals] = useState({ count: 0, totalMinutes: 0, nightMinutes: 0, cached: false });
  const [signature, setSignature] = useState('');
  useEffect(() => {
    let active = true;
    void listSessions(learner.account_id, learner.id).then(rows => {
      if (active) setSignature(rows.filter(row => row.session.status === 'finished')
        .map(row => row.session.id + ':' + row.session.metrics.movingSeconds + ':' + row.session.metrics.stoppedSeconds).join('|'));
    });
    return () => { active = false; };
  }, [learner.account_id, learner.id, version]);
  useFocusEffect(useCallback(() => {
    // Recompute when the persisted finished-session signature changes.
    void signature;
    let mounted = true;
    void (async () => {
      const rows = (await listSessions(learner.account_id, learner.id)).filter(row => row.session.status === 'finished');
      const discarded = await pendingDiscards(learner.account_id);
      let count = rows.length;
      let seconds = rows.reduce((sum, row) => sum + row.session.metrics.movingSeconds + row.session.metrics.stoppedSeconds, 0);
      let night = rows.reduce((sum, row) => sum + row.session.metrics.nightSeconds, 0);
      let cached = false;
      if (supabase) {
        const result = await supabase.rpc('practice_totals', { p_learner_id: learner.id,
          p_exclude_ids: [...rows.map(row => row.session.id), ...discarded.map(row => row.id)] }).single();
        if (result.error) cached = true;
        else {
          const data = result.data as { sessions_count: number; recorded_seconds: number; night_seconds: number };
          count += Number(data.sessions_count); seconds += Number(data.recorded_seconds); night += Number(data.night_seconds);
        }
      }
      if (mounted) setTotals({ count, totalMinutes: Math.floor(seconds / 60), nightMinutes: Math.floor(night / 60), cached });
    })().catch(() => { if (mounted) setTotals(current => ({ ...current, cached: true })); });
    return () => { mounted = false; };
  }, [learner.account_id, learner.id, signature]));
  return totals;
}
export function PracticeSummary({ learner }: { learner: Learner }) {
  const totals = usePracticeTotals(learner);
  return <Pressable accessibilityRole="button" accessibilityLabel={totals.count + ' practice sessions. Open practice history.'}
    onPress={() => router.push({ pathname: '/learners/[learnerId]/practice', params: { learnerId: learner.id } })} style={styles.card}>
    <View style={styles.icon}><AppIcon name="route" size={26} color={colors.accentInk} /></View>
    <View style={styles.copy}><Text style={styles.title}>Practice sessions</Text><Text style={styles.body}>{totals.count} practice {totals.count === 1 ? 'session' : 'sessions'}</Text>
      {totals.cached && <Text style={styles.small}>Saved on this device · refresh pending</Text>}</View>
    <AppIcon name="chevronRight" size={22} color={colors.muted} />
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  icon: { height: 48, width: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 5 }, title: { fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted }, small: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
