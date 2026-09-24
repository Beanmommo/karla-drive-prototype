import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { LearnerIdentity } from './LearnerIdentity';
import { elapsedSeconds, formatDuration, validPoint, type PracticeSession } from './model';

type PracticeDashboardProps = {
  session: PracticeSession;
  tips: ReactNode;
  notice?: ReactNode;
  stopping: boolean;
  onStop: () => void;
};

export function PracticeDashboard({ session, tips, notice, stopping, onStop }: PracticeDashboardProps) {
  const { height } = useWindowDimensions();
  const compact = height < 740;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const { metrics } = session;
  const point = metrics.lastPoint;
  // A running recording alone does not confirm GPS reception. Expire stale fixes
  // and hide stale speed while acquisition resumes, without changing saved data.
  const gpsAcquired = session.status === 'active' && !session.tracking_error && point && validPoint(point)
    && now - point.timestamp >= -1000 && now - point.timestamp < 20000;
  const speed = gpsAcquired && metrics.currentSpeed !== null ? (metrics.currentSpeed * 3.6).toFixed(0) : '—';

  return <SafeAreaView style={styles.screen}>
    <View style={styles.progressTrack} />
    <View style={[styles.content, compact && styles.compactContent]}>
      <View style={[styles.top, compact && styles.compactTop, !tips && styles.topWithoutTips]}>
        <LearnerIdentity id={session.learner_id} name={session.learner_name} />
        {tips}
      </View>

      <View style={[styles.bottom, compact && styles.compactBottom]}>
        <View style={styles.metrics}>
          <View style={[styles.elapsed, compact && styles.compactMetric]}>
            <Text style={styles.label}>Elapsed time</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.timer, compact && styles.compactTimer]}>
              {formatDuration(elapsedSeconds(session, now))}
            </Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={[styles.metric, compact && styles.compactMetric]}>
              <Text style={styles.label}>Current speed</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>{speed}<Text style={styles.unit}> km/h</Text></Text>
            </View>
            <View style={[styles.metric, styles.distance, compact && styles.compactMetric]}>
              <Text style={styles.label}>Distance</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>{(metrics.distanceMeters / 1000).toFixed(2)}<Text style={styles.unit}> km</Text></Text>
            </View>
          </View>
        </View>

        <View accessibilityLiveRegion="polite" style={[styles.gpsBanner, gpsAcquired && styles.gpsAcquired]}>
          {gpsAcquired ? <AppIcon name="check" size={18} color="#24613D" />
            : <ActivityIndicator size="small" color={colors.muted} />}
          <Text style={[styles.gpsText, gpsAcquired && styles.gpsAcquiredText]}>{gpsAcquired ? 'GPS acquired' : 'Acquiring GPS'}</Text>
        </View>
        {notice}
        <Pressable accessibilityRole="button" accessibilityLabel={stopping ? 'Stopping practice session' : 'Stop practice session'}
          accessibilityHint="Finish recording and review this practice session" accessibilityState={{ disabled: stopping, busy: stopping }}
          disabled={stopping} onPress={onStop}
          style={({ pressed }) => [styles.stop, compact && styles.compactStop, pressed && styles.stopPressed, stopping && styles.stopDisabled]}>
          {stopping ? <ActivityIndicator color={colors.surface} /> : <AppIcon name="stop" size={30} color={colors.surface} strokeWidth={3} />}
        </Pressable>
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  progressTrack: { height: 6, backgroundColor: colors.accentEdge },
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12 },
  compactContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 8 },
  top: { flex: 1, minHeight: 0, gap: 14, paddingBottom: 16 },
  compactTop: { gap: 8, paddingBottom: 10 },
  topWithoutTips: { flex: 0 },
  bottom: { flex: 1, minHeight: 326, paddingTop: 16, gap: 12 },
  compactBottom: { minHeight: 274, paddingTop: 10, gap: 8 },
  metrics: { flex: 1, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  elapsed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.accentSoft },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  timer: { fontFamily: fonts.medium, fontSize: 40, fontVariant: ['tabular-nums'], color: colors.accentInk },
  compactTimer: { fontSize: 34 },
  metricsRow: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border },
  metric: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  compactMetric: { paddingVertical: 5 },
  distance: { borderLeftWidth: 1, borderColor: colors.border },
  value: { fontFamily: fonts.medium, fontSize: 29, fontVariant: ['tabular-nums'], color: colors.ink },
  unit: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  gpsBanner: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.neutralSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  gpsAcquired: { backgroundColor: '#E2F3E8' },
  gpsText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  gpsAcquiredText: { color: '#24613D' },
  stop: { width: 76, height: 76, borderRadius: 38, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#B9353F' },
  compactStop: { width: 64, height: 64, borderRadius: 32 },
  stopPressed: { backgroundColor: '#962B34' },
  stopDisabled: { opacity: 0.6 },
});
