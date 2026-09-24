import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { FormSheet } from '../../components/FormSheet';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, fonts } from '../../theme';
import type { Learner } from '../learners/model';
import { useLearnerModules } from '../modules/ModuleStatusesProvider';
import { moduleCatalogue, moduleStatusLabels, type ModuleId, type ModuleStatus } from '../modules/model';
import { eventCounts, eventModules, elapsedSeconds, formatDuration, gapSeconds, type PracticeEvent, type PracticeSession, type StoredSession, type TrackPoint } from './model';
import { usePractice } from './PracticeProvider';
import { RoutePreview } from './RoutePreview';
import { discardSession, getSession, readEvents, readPoints } from './store';
import { fetchPracticeDetails } from './sync';

export function useSessionDetails(id: string, learner: Learner) {
  const { version } = usePractice();
  const [record, setRecord] = useState<StoredSession | null>(null);
  const [events, setEvents] = useState<PracticeEvent[]>([]);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([getSession(id, learner.account_id), readEvents(id), readPoints(id)]).then(([row, events, points]) => {
      if (!active) return;
      setRecord(row?.session.learner_id === learner.id ? row : null);
      setEvents(events); setPoints(points); setLoaded(true);
    }).catch(() => { if (active) { setError('Could not read the saved recording.'); setLoaded(true); } });
    return () => { active = false; };
  }, [id, learner.account_id, learner.id, version]);
  useEffect(() => {
    let active = true;
    void fetchPracticeDetails(id, learner.account_id).catch(() => { if (active) setError('Showing the recording saved on this device.'); });
    return () => { active = false; };
  }, [id, learner.account_id]);
  return { record, events, points, loaded, error };
}
export function SessionSummary({ session, events }: { session: PracticeSession; events: PracticeEvent[] }) {
  const counts = eventCounts(events);
  const m = session.metrics;
  const cells = [
    ['Elapsed', formatDuration(elapsedSeconds(session))], ['Moving', formatDuration(m.movingSeconds)],
    ['Stopped', formatDuration(m.stoppedSeconds)], ['Distance', (m.distanceMeters / 1000).toFixed(2) + ' km'],
    ['Average moving speed', m.movingSeconds ? (m.distanceMeters / m.movingSeconds * 3.6).toFixed(1) + ' km/h' : '—'],
    ['Maximum speed', (m.maxSpeed * 3.6).toFixed(1) + ' km/h'],
  ];
  return <>
    <View style={styles.metrics}>{cells.map(([label, value]) => <View key={label} style={styles.metric}>
      <Text style={styles.label}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>)}</View>
    {gapSeconds(session) > 5 && <Text style={styles.notice}>Unclassified / GPS gap time: {formatDuration(gapSeconds(session))}. This time is not counted as moving or stopped.</Text>}
    <Text style={styles.heading}>Detected activity</Text>
    <View style={styles.counts}>
      {[['Left turns', counts.left_turn], ['Right turns', counts.right_turn], ['Roundabouts', counts.roundabout],
        ['Moving off', counts.start], ['Stops', counts.stop], ['Possible merges', counts.merge]].map(([label, count]) =>
        <View key={label} style={styles.countRow}><Text style={styles.body}>{label}</Text><Text style={styles.count}>{count}</Text></View>)}
    </View>
    <Text style={styles.notice}>Detections suggest what was practised. Your supervisor assesses how it went.</Text>
    {(session.detection_error || (session.metrics.lastPoint?.timestamp ?? 0) - session.matched_until > 20000) &&
      <Text style={styles.notice}>Road matching is pending. Counts may update when a connection is available.</Text>}
    {session.interrupted && <Text style={styles.notice}>This recording was interrupted. Only recorded intervals contribute to practice hours.</Text>}
  </>;
}
export function SessionReviewContent({ sessionId, learner, onClose }: { sessionId: string; learner: Learner; onClose: () => void }) {
  const { record, events, points, loaded, error } = useSessionDetails(sessionId, learner);
  const assessments = useLearnerModules(learner);
  const { saveReview, sync } = usePractice();
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState<PracticeSession['review']>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Record<string, { status: ModuleStatus; updatedAt: string | null }> | null>(null);
  // Freeze the review baseline once loaded so a concurrent refresh cannot move the user's choices.
  if (!baseline && assessments.loaded) {
    setBaseline(Object.fromEntries(moduleCatalogue.map(module => {
      const record = assessments.records.find(row => row.module_id === module.id);
      return [module.id, { status: record?.status ?? 'not_performed', updatedAt: record?.updated_at ?? null }];
    })));
  }
  if (!loaded) return <Text style={styles.body}>Loading recording…</Text>;
  if (!record) return <Text style={styles.body}>This session is no longer available.</Text>;
  const { session } = record;
  const reviewed = session.reviewed_at !== null;
  const modules = moduleCatalogue.filter(module => showAll || (baseline?.[module.id]?.status ?? 'not_performed') !== 'excellent');
  async function save() {
    if (saving) return;
    setSaving(true); setSaveError(null);
    try { await saveReview(sessionId, draft); await assessments.refresh(); onClose(); }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Could not save the review.'); }
    finally { setSaving(false); }
  }
  function discard() {
    Alert.alert('Discard this session?', 'The recording and detected activities will be removed from history and practice totals. Module assessments will stay unchanged.', [
      { text: 'Keep session', style: 'cancel' },
      { text: 'Discard session', style: 'destructive', onPress: () => {
        setSaving(true);
        void discardSession(sessionId, learner.account_id).then(() => { void sync(); onClose(); })
          .catch(cause => setSaveError(cause.message)).finally(() => setSaving(false));
      } },
    ]);
  }
  return <>
    <Text style={styles.learner}>{learner.name}</Text>
    <Text style={styles.notice}>{new Date(session.started_at).toLocaleString()} · {session.route.mode === 'generated' ? 'Generated loop' : 'Destination chosen in Maps'}</Text>
    <SessionSummary session={session} events={events} />
    {points.length > 1 && <RoutePreview points={points} recorded />}
    {(error || record.syncError) && <Text style={styles.notice}>{record.syncError ?? error}</Text>}
    {record.dirty && learner.account_id !== 'local-demo' && <Text style={styles.notice}>Saved on this device · upload pending</Text>}
    {session.review_conflicts.length > 0 && <Text style={styles.notice}>Some module assessments changed after this review began. Those newer assessments were preserved; your session review is still saved.</Text>}
    <View style={styles.reviewHeading}><Text style={styles.heading}>{reviewed ? 'Supervisor review' : 'Review the modules'}</Text>
      {!reviewed && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: showAll }} onPress={() => setShowAll(value => !value)}>
        <Text style={styles.link}>{showAll ? 'Show priority' : 'Show all'}</Text></Pressable>}</View>
    {!reviewed && <Text style={styles.notice}>Showing Need practice and Not performed by default. Change only the assessments you want to update.</Text>}
    {reviewed ? <>
      {Object.entries(session.review).map(([moduleId, choice]) => <View key={moduleId} style={styles.countRow}>
        <Text style={[styles.body, styles.flex]}>{moduleCatalogue.find(module => module.id === moduleId)?.title}</Text>
        <Text style={styles.count}>{choice ? moduleStatusLabels[choice.status] : ''}</Text></View>)}
      {!Object.keys(session.review).length && <Text style={styles.body}>Reviewed with no module status changes.</Text>}
      <PrimaryButton label="Done" fullWidth onPress={onClose} />
    </> : <>
      {!baseline && <Text style={styles.notice}>{assessments.error ?? 'Loading current module assessments…'}</Text>}
      {baseline && modules.map(module => {
        const evidence = events.filter(event => eventModules[event.kind] === module.id);
        const status = draft[module.id]?.status ?? baseline[module.id].status;
        return <View key={module.id} style={styles.module}>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          {evidence.length > 0 && <Text style={styles.evidence}>{evidence.length} detected {evidence.length === 1 ? 'activity' : 'activities'} · supervisor review needed</Text>}
          <View accessibilityRole="radiogroup" accessibilityLabel={module.title + ' assessment'} style={styles.choices}>
            {(Object.keys(moduleStatusLabels) as ModuleStatus[]).map(value => <Pressable key={value} accessibilityRole="radio"
              accessibilityLabel={module.title + ': ' + moduleStatusLabels[value]} accessibilityState={{ checked: status === value, disabled: saving }}
              disabled={saving} onPress={() => setDraft(current => {
                const next = { ...current };
                if (value === baseline[module.id].status) delete next[module.id];
                else next[module.id as ModuleId] = { status: value, expectedUpdatedAt: baseline[module.id].updatedAt };
                return next;
              })} style={[styles.choice, status === value && styles.choiceSelected]}>
              <Text style={[styles.choiceText, status === value && styles.choiceTextSelected]}>{moduleStatusLabels[value]}</Text>
            </Pressable>)}
          </View>
        </View>;
      })}
      {saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text>}
      <PrimaryButton label="Save session & review" loading={saving} disabled={!baseline} fullWidth onPress={() => void save()} />
      <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.secondary}><Text style={styles.link}>Review later</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={discard} style={styles.discard}>
        <AppIcon name="trash" size={19} color={colors.error} /><Text style={styles.discardText}>Discard session</Text>
      </Pressable>
    </>}
  </>;
}
export function SessionReviewSheet(props: { sessionId: string; learner: Learner; onClose: () => void }) {
  return <FormSheet visible title="Practice results" onClose={props.onClose}><SessionReviewContent {...props} /></FormSheet>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, learner: { fontFamily: fonts.medium, fontSize: 22, color: colors.ink },
  heading: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink }, body: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metric: { flexBasis: '47%', flexGrow: 1, padding: 13, borderRadius: 16, backgroundColor: colors.accentSoft, gap: 5 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted }, metricValue: { fontFamily: fonts.medium, fontSize: 21, color: colors.accentInk },
  notice: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted },
  counts: { gap: 10 }, countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  count: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink }, reviewHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  module: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, gap: 12 },
  moduleTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink }, evidence: { fontFamily: fonts.regular, fontSize: 12, color: colors.accentInk },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, choice: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.neutralSoft },
  choiceSelected: { backgroundColor: colors.accentSoft }, choiceText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  choiceTextSelected: { color: colors.accentInk, fontFamily: fonts.medium }, link: { color: colors.accentInk, fontFamily: fonts.medium, fontSize: 15 },
  secondary: { padding: 14, alignItems: 'center' }, discard: { minHeight: 48, padding: 14, borderRadius: 15, backgroundColor: colors.errorSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  discardText: { fontFamily: fonts.medium, fontSize: 16, color: colors.error }, error: { fontFamily: fonts.regular, color: colors.error, fontSize: 14 },
});
