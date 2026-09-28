import { router } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { LearnerAvatar } from '../learners/LearnerAvatar';
import { getPracticeBadges } from './badges';
import { elapsedSeconds, formatDuration, type PracticeSession, type StoredSession, type TrackPoint } from './model';
import { RoutePreview } from './RoutePreview';
import { formatSessionStart } from './sessionLabels';
import { readPoints } from './store';
import { fetchPracticeDetails } from './sync';

export const PracticeSessionCard = memo(function PracticeSessionCard({ record, now }: { record: StoredSession; now: number }) {
  const { session } = record;
  const [points, setPoints] = useState<TrackPoint[] | null>(null);
  const [trailError, setTrailError] = useState(false);
  const lastTimestamp = session.metrics.lastPoint?.timestamp;
  useEffect(() => {
    let active = true;
    async function loadTrail() {
      try {
        let saved = await readPoints(session.id);
        if (!active) return;
        if (saved.length) setPoints(saved);
        if (lastTimestamp && (!saved.length || saved[saved.length - 1].timestamp < lastTimestamp) && !record.dirty) {
          await fetchPracticeDetails(session.id, session.account_id);
          if (!active) return;
          saved = await readPoints(session.id);
        }
        if (active) { setPoints(saved); setTrailError(false); }
      } catch {
        if (active) { setTrailError(true); setPoints(current => current ?? []); }
      }
    }
    void loadTrail();
    return () => { active = false; };
  }, [session.id, session.account_id, lastTimestamp, record.dirty]);

  return <PracticeSessionCardContent session={session} points={points} trailError={trailError} now={now} />;
});

export function PracticeSessionCardContent({ session, points, trailError = false, now }: {
  session: PracticeSession; points: TrackPoint[] | null; trailError?: boolean; now: number;
}) {
  const duration = formatDuration(elapsedSeconds(session)).split(':').slice(0, 2).join(':');
  const kilometers = (session.metrics.distanceMeters / 1000).toFixed(1);
  const badges = getPracticeBadges(session);
  const startLabel = formatSessionStart(session.started_at, now);
  const nameParts = session.learner_name.trim().split(/\s+/);
  const learnerName = nameParts.length > 1
    ? `${nameParts[0]} ${Array.from(nameParts[nameParts.length - 1])[0].toLocaleUpperCase()}.`
    : nameParts[0];
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${session.learner_name}, ${startLabel}, duration ${duration} hours and minutes, ${kilometers} kilometres${badges.map(badge => `, ${badge.label}`).join('')}`}
    accessibilityHint="View practice session details"
    onPress={() => router.push({ pathname: '/learners/[learnerId]/practice/[sessionId]', params: { learnerId: session.learner_id, sessionId: session.id } })}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View pointerEvents="none" aria-hidden style={styles.trail}>
      {points?.length ? <RoutePreview points={points} recorded compact /> : <View style={styles.placeholder}>
        <AppIcon name="route" size={28} color={colors.accentInk} />
        <Text style={styles.placeholderText}>{points === null ? 'Loading trail…' : trailError ? 'Trail unavailable' : 'No GPS trail'}</Text>
      </View>}
    </View>
    <View aria-hidden style={styles.summary}>
      <View style={styles.startDetails}>
        <View style={styles.learnerIdentity}>
          <LearnerAvatar learnerId={session.learner_id} size={28} />
          <Text numberOfLines={1} style={styles.learnerName}>{learnerName}</Text>
        </View>
        <Text style={styles.startTime}>{startLabel}</Text>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.label}>Time</Text><Text style={styles.value}>{duration}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>Km driven</Text><Text style={styles.value}>{kilometers}</Text></View>
      </View>
      {badges.length > 0 && <View style={styles.badges}>
        {badges.map(badge => <View key={badge.id} style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <AppIcon name={badge.icon} size={14} color={badge.color} />
          <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
        </View>)}
      </View>}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  pressed: { opacity: 0.75 },
  trail: { width: '100%', aspectRatio: 320 / 190, backgroundColor: colors.accentSoft, borderBottomWidth: 1, borderBottomColor: colors.border },
  startDetails: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  learnerIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  learnerName: { flex: 1, minWidth: 0, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink },
  startTime: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, textAlign: 'right', color: colors.muted },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
  placeholderText: { fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', color: colors.muted },
  summary: { padding: 18, gap: 14 },
  metrics: { flexDirection: 'row', gap: 20 },
  metric: { flex: 1, gap: 5 },
  label: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  value: { fontFamily: fonts.medium, fontSize: 24, color: colors.ink, fontVariant: ['tabular-nums'] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 },
  badgeLabel: { fontFamily: fonts.medium, fontSize: 12, flexShrink: 1 },
});
