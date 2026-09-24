import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RequirementCheckbox } from '../../components/RequirementCheckbox';
import { SelectField } from '../../components/SelectField';
import { colors, fonts } from '../../theme';
import { useLearners } from '../learners/LearnersProvider';
import type { Learner } from '../learners/model';
import { mapboxToken } from './config';
import { LearnerIdentity } from './LearnerIdentity';
import { appleMapsUrl, durationOptions, type PracticeRoute } from './model';
import { hasPracticeAccess } from './permissions';
import { usePractice } from './PracticeProvider';
import { practiceRequirements } from './requirements';
import { RoutePreview } from './RoutePreview';
import { generateLoop } from './routing';
import { freshLocation, startPractice } from './runtime';
import { getActiveSession } from './store';

export function PracticeWizardScreen() {
  const { selectedLearner, loading } = useLearners();
  const { admitted } = usePractice();
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const learnerId = selectedLearner?.id;
  const accountId = selectedLearner?.account_id;

  useFocusEffect(useCallback(() => {
    let current = true;
    if (loading) return;
    void (async () => {
      const running = await getActiveSession();
      if (!current) return;
      if (running && running.session.account_id === accountId) {
        router.replace('/practice/active');
        return;
      }
      const allowed = learnerId && admitted && await hasPracticeAccess();
      if (!current) return;
      if (allowed) setReadyFor(learnerId);
      else router.replace('/home');
    })().catch(() => { if (current) router.replace('/home'); });
    return () => { current = false; };
  }, [accountId, admitted, learnerId, loading]));

  return selectedLearner && admitted && readyFor === selectedLearner.id
    ? <PracticeWizard key={selectedLearner.id} learner={selectedLearner} />
    : <SafeAreaView style={styles.screen}><ActivityIndicator style={styles.loading} color={colors.accentInk} /></SafeAreaView>;
}

function PracticeWizard({ learner }: { learner: Learner }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [checks, setChecks] = useState<string[]>([]);
  const [mode, setMode] = useState<'generated' | 'destination'>('generated');
  const [duration, setDuration] = useState('45');
  const [route, setRoute] = useState<PracticeRoute | null>(null);
  const [phase, setPhase] = useState<'idle' | 'generating' | 'starting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const operation = useRef<AbortController | null>(null);
  const starting = useRef(false);
  const busy = phase !== 'idle';
  const allChecked = practiceRequirements.every(item => checks.includes(item.id));
  const startDisabled = busy || (mode === 'generated' && !route);

  useEffect(() => () => operation.current?.abort(), []);

  const goBack = useCallback(() => {
    // Once recording starts, keep this screen mounted until the handoff completes.
    if (starting.current) return;
    operation.current?.abort();
    operation.current = null;
    setPhase('idle');
    setError(null);
    if (step === 2) {
      setStep(1);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } else if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, [step]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
    return () => subscription.remove();
  }, [goBack]));

  async function generate() {
    if (operation.current || starting.current || step !== 2 || mode !== 'generated' || !duration) return;
    const controller = new AbortController();
    operation.current = controller;
    setRoute(null);
    setError(null);
    setPhase('generating');
    try {
      if (Platform.OS === 'ios' && parseFloat(String(Platform.Version)) < 18.4) {
        throw new Error('Multi-stop Apple Maps routes require iOS 18.4 or later. Use Pick destination on this device.');
      }
      const fix = await freshLocation();
      if (controller.signal.aborted) return;
      const generated = await generateLoop(fix, Number(duration), mapboxToken(), controller.signal);
      if (!controller.signal.aborted) setRoute(generated);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not generate a route. Please try again.');
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setPhase('idle');
      }
    }
  }

  async function start() {
    if (operation.current || starting.current || !allChecked || step !== 2 || (mode === 'generated' && !route)) return;
    starting.current = true;
    setError(null);
    setPhase('starting');
    try {
      const selected: PracticeRoute = mode === 'generated' && route ? route : {
        mode: 'destination', requestedMinutes: 0, origin: { latitude: 0, longitude: 0 },
        stops: [], geometry: [], estimatedSeconds: 0, distanceMeters: 0,
      };
      const session = await startPractice(learner, selected, checks);
      // Remove setup from the back stack; returning from Maps shows the live session.
      router.replace('/practice/active');
      try { await Linking.openURL(appleMapsUrl(session.route)); }
      catch { Alert.alert('Practice is recording', 'Apple Maps could not open. Use Open Apple Maps to retry, or Stop to end this session.'); }
    } catch (cause) {
      // A failed start may mean the origin moved; require a fresh loop before retrying.
      setRoute(null);
      setError(cause instanceof Error ? cause.message : 'Could not start practice. Please try again.');
    } finally {
      starting.current = false;
      setPhase('idle');
    }
  }

  const buttonLabel = phase === 'starting' ? 'Starting practice…'
    : mode === 'generated' ? 'Start in Apple Maps' : 'Start recording and open Apple Maps';

  return <SafeAreaView style={styles.screen}>
    <View accessibilityRole="progressbar" accessibilityLabel="Practice setup progress"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={step * 50}
      aria-valuetext={`${step === 1 ? 'Before you drive' : 'Route settings'}, ${step} of 2`} style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${step * 50}%` }]} />
    </View>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={step === 1 ? 'Back to Home' : 'Back to pre-drive checks'}
        accessibilityState={{ disabled: phase === 'starting' }} disabled={phase === 'starting'} onPress={goBack} style={styles.backButton}>
        <AppIcon name="back" size={23} />
      </Pressable>
      <Text style={styles.headerTitle}>Start practice</Text>
      <Text style={styles.stepBadge}>{step} of 2</Text>
    </View>
    <ScrollView ref={scroll} style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={styles.introduction}>
        <View style={styles.iconCircle}><AppIcon name={step === 1 ? 'shield' : 'route'} size={30} color={colors.accentInk} /></View>
        <Text accessibilityRole="header" style={styles.title}>{step === 1 ? 'Before you drive' : 'Route settings'}</Text>
      </View>
      <LearnerIdentity id={learner.id} name={learner.name} />
      {step === 1 ? <View style={styles.checks}>
          {practiceRequirements.map(item => <RequirementCheckbox key={item.id} title={item.title}
            checked={checks.includes(item.id)} onChange={checked => setChecks(current => checked
              ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))} />)}
        </View> : <View style={styles.fields}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Route mode" style={styles.segment}>
          {(['generated', 'destination'] as const).map(value => <Pressable key={value} accessibilityRole="radio"
            accessibilityState={{ checked: mode === value, disabled: busy }} disabled={busy}
            onPress={() => { if (!operation.current && !starting.current && mode !== value) { setMode(value); setRoute(null); setError(null); } }}
            style={[styles.segmentOption, mode === value && styles.selectedSegment]}>
            <Text style={[styles.segmentText, mode === value && styles.selectedText]}>{value === 'generated' ? 'Generate route' : 'Pick destination'}</Text>
          </Pressable>)}
        </View>
        {mode === 'generated' ? <>
          <SelectField label="Duration" placeholder="Choose duration" value={duration} options={durationOptions} disabled={busy}
            onChange={value => { if (!operation.current && !starting.current && duration !== value) { setDuration(value); setRoute(null); setError(null); } }} />
          <PrimaryButton label={phase === 'generating' ? 'Generating route…' : 'Generate Route'} fullWidth variant="secondary"
            loading={phase === 'generating'} disabled={busy || !duration} onPress={() => void generate()} />
          {route && <View style={styles.generatedRoute} onLayout={() => scroll.current?.scrollToEnd({ animated: true })}>
            <RoutePreview points={route.geometry} stops={route.stops} />
            <View style={styles.routeReady} accessibilityLiveRegion="polite">
              <AppIcon name="check" size={22} color={colors.accentInk} />
              <View style={styles.routeSummary}>
                <Text style={styles.routeTitle}>Route ready</Text>
                <Text style={styles.routeDetails}>{Math.round(route.estimatedSeconds / 60)} min · {(route.distanceMeters / 1000).toFixed(1)} km</Text>
              </View>
            </View>
          </View>}
        </> : <View style={styles.destination}>
          <AppIcon name="location" size={40} color={colors.accentInk} />
          <Text style={styles.subheading}>Choose your destination in Maps</Text>
        </View>}
      </View>}
    </ScrollView>
    <View style={styles.footer}>
      <View style={styles.actions}>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {step === 1 ? <PrimaryButton label="Next" fullWidth disabled={!allChecked} onPress={() => {
          if (!allChecked) return;
          setStep(2);
          scroll.current?.scrollTo({ y: 0, animated: false });
        }} /> : <Pressable accessibilityRole="button" accessibilityLabel={buttonLabel}
          accessibilityState={{ disabled: startDisabled, busy: phase === 'starting' }}
          disabled={startDisabled} onPress={() => void start()}
          style={({ pressed }) => [styles.mapsButton, startDisabled && styles.dim, pressed && styles.pressed]}>
          {phase === 'starting' ? <ActivityIndicator color={colors.accentInk} style={styles.mapsIcon} />
            : <Image source={require('../../../assets/apple-maps.png')} style={styles.mapsIcon} accessibilityIgnoresInvertColors />}
          <Text style={styles.mapsTitle}>{buttonLabel}</Text>
        </Pressable>}
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1 },
  progressTrack: { width: '100%', height: 6, backgroundColor: colors.accentSoft },
  progressFill: { height: '100%', backgroundColor: colors.accentEdge },
  header: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  headerTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 18, color: colors.ink },
  stepBadge: { fontFamily: fonts.medium, fontSize: 14, color: colors.accentInk, backgroundColor: colors.accentSoft, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  body: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 },
  introduction: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  iconCircle: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 26, lineHeight: 33, color: colors.ink },
  checks: { gap: 12, marginTop: 22 },
  fields: { gap: 20, marginTop: 24 },
  segment: { flexDirection: 'row', backgroundColor: colors.neutralSoft, borderRadius: 17, padding: 4 },
  segmentOption: { flex: 1, paddingHorizontal: 5, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  selectedSegment: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmentText: { fontFamily: fonts.medium, fontSize: 15, textAlign: 'center', color: colors.muted },
  selectedText: { color: colors.accentInk },
  generatedRoute: { gap: 16 },
  routeReady: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.accentSoft },
  routeSummary: { flex: 1, gap: 4 },
  routeTitle: { fontFamily: fonts.medium, fontSize: 17, color: colors.accentInk },
  routeDetails: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  destination: { alignItems: 'center', paddingVertical: 20, gap: 16 },
  subheading: { fontFamily: fonts.medium, fontSize: 20, textAlign: 'center', color: colors.ink },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background },
  actions: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 12, gap: 12 },
  mapsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 76, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22, backgroundColor: colors.accent, borderBottomWidth: 4, borderColor: colors.accentEdge },
  mapsIcon: { width: 40, height: 40 },
  mapsTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, textAlign: 'center', color: colors.ink },
  dim: { opacity: 0.45 },
  pressed: { backgroundColor: colors.accentPressed },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.error },
});
