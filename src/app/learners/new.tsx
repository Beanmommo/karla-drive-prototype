import { randomUUID } from 'expo-crypto';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { DateOfBirthField } from '../../components/DateOfBirthField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { RequirementCheckbox } from '../../components/RequirementCheckbox';
import { SelectField } from '../../components/SelectField';
import { DemoAgreement } from '../../features/learners/DemoAgreement';
import { LearnerConfirmation } from '../../features/learners/LearnerConfirmation';
import { useLearners } from '../../features/learners/LearnersProvider';
import { dateToISO, emptyAcknowledgements, getAge, learnerRequirements, parseBirthDate, validateLearner, type LearnerDraft } from '../../features/learners/model';
import { colors, fonts } from '../../theme';

const steps = {
  1: { title: 'Location', icon: 'location' },
  2: { title: 'Learner details', icon: 'user' },
  3: { title: 'Confirm', icon: 'check' },
} as const;

type Step = keyof typeof steps;

export default function CreateLearnerScreen() {
  const { addLearner } = useLearners();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<LearnerDraft>({
    name: '', dateOfBirth: '', country: '', state: '', acknowledgements: emptyAcknowledgements(), termsAccepted: false,
  });
  const [termsOpen, setTermsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const savingRef = useRef(false);
  const submissionId = useRef<string | null>(null);

  const goBack = useCallback(() => {
    if (savingRef.current) return;
    Keyboard.dismiss();
    if (step > 1) {
      setStep(step === 3 ? 2 : 1);
      setError(null);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } else if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, [step]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack]));

  function updateDraft(update: Partial<LearnerDraft>) {
    setDraft((previous) => ({ ...previous, ...update }));
    setError(null);
  }

  function goToStep(next: Step) {
    if (savingRef.current) return;
    Keyboard.dismiss();
    setStep(next);
    setError(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  async function create() {
    if (savingRef.current || step !== 3) return;
    const validation = validateLearner(draft);
    if (validation) { setError(validation); return; }
    Keyboard.dismiss();
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      submissionId.current ??= randomUUID();
      await addLearner(submissionId.current, draft);
      router.dismissTo('/home');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your learner. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const dateError = !draft.dateOfBirth ? null
    : !parseBirthDate(draft.dateOfBirth) ? 'Enter a valid date of birth.'
      : draft.dateOfBirth > dateToISO(new Date()) ? 'Date of birth cannot be in the future.'
        : getAge(draft.dateOfBirth) < 16 ? 'Victorian car learners must be at least 16 years old.' : null;
  const readyToCreate = validateLearner(draft) === null;
  const progress = step / 3 * 100;

  return (
    <SafeAreaView style={styles.screen}>
      <View accessibilityRole="progressbar" accessibilityLabel="Learner setup progress"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${steps[step].title}, ${step} of 3`} style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={step === 1 ? 'Back to Home' : step === 2 ? 'Back to location' : 'Back to learner details'}
          disabled={saving} onPress={goBack} style={styles.backButton}>
          <AppIcon name="back" size={23} />
        </Pressable>
        <Text style={styles.headerTitle}>Add learner</Text>
        <Text style={styles.stepBadge}>{step} of 3</Text>
      </View>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.introduction}>
            <View style={styles.iconCircle}><AppIcon name={steps[step].icon} size={30} color={colors.accentInk} /></View>
            <Text accessibilityRole="header" style={styles.title}>{steps[step].title}</Text>
          </View>

          {step === 1 ? (
            <View style={styles.fields}>
              <SelectField label="Country" placeholder="Select country" value={draft.country}
                options={[{ label: 'Australia', value: 'AU' }]}
                onChange={(country) => updateDraft({ country, state: country === draft.country ? draft.state : '' })} />
              {!!draft.country && <SelectField label="State" placeholder="Select state" value={draft.state}
                options={[{ label: 'Victoria', value: 'VIC' }]} onChange={(state) => updateDraft({ state })} />}
            </View>
          ) : step === 2 ? (
            <View style={styles.fields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Learner’s name</Text>
                <TextInput accessibilityLabel="Learner’s name" value={draft.name} onChangeText={(name) => updateDraft({ name })}
                  editable={!saving} placeholder="Enter their name" placeholderTextColor={colors.muted} maxLength={100}
                  autoCapitalize="words" autoCorrect={false} textContentType="name" returnKeyType="done" style={styles.input} />
              </View>
              <DateOfBirthField value={draft.dateOfBirth} onChange={(dateOfBirth) => updateDraft({ dateOfBirth })} disabled={saving} />
              {dateError && <Text accessibilityRole="alert" style={styles.fieldError}>{dateError}</Text>}

              {draft.country === 'AU' && draft.state === 'VIC' && (
                <View style={styles.requirements}>
                  {learnerRequirements.map(({ id, title, description }) => (
                    <RequirementCheckbox key={id} title={title} description={description} checked={draft.acknowledgements[id]}
                      disabled={saving} onChange={(checked) => updateDraft({ acknowledgements: { ...draft.acknowledgements, [id]: checked } })} />
                  ))}
                </View>
              )}

              <View style={styles.agreement}>
                <RequirementCheckbox title="I agree to the demo terms & agreement" checked={draft.termsAccepted}
                  disabled={saving} onChange={(termsAccepted) => updateDraft({ termsAccepted })} />
                <Pressable accessibilityRole="button" onPress={() => setTermsOpen(true)} style={styles.linkButton}>
                  <Text style={styles.link}>Read demo terms & agreement</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <LearnerConfirmation draft={draft} onEditLocation={() => goToStep(1)}
              onEditDetails={() => goToStep(2)} disabled={saving} />
          )}

          <View style={styles.actions}>
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {step !== 3 ? (
              <PrimaryButton label="Next" fullWidth
                disabled={step === 1 ? draft.country !== 'AU' || draft.state !== 'VIC' : !readyToCreate}
                onPress={() => goToStep(step === 1 ? 2 : 3)} />
            ) : <PrimaryButton label={saving ? 'Creating learner…' : 'Create learner'} fullWidth disabled={!readyToCreate} loading={saving} onPress={() => void create()} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DemoAgreement visible={termsOpen} onClose={() => setTermsOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  progressTrack: { width: '100%', height: 6, backgroundColor: colors.accentSoft },
  progressFill: { height: '100%', backgroundColor: colors.accentEdge },
  header: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
  headerTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 18, color: colors.ink },
  stepBadge: { fontFamily: fonts.medium, fontSize: 14, color: colors.accentInk, backgroundColor: colors.accentSoft, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  body: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 },
  introduction: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  iconCircle: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 26, lineHeight: 33, color: colors.ink },
  fields: { gap: 22 },
  fieldGroup: { gap: 9 },
  label: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  input: { minHeight: 60, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 18, paddingVertical: 15, fontFamily: fonts.regular, fontSize: 18, color: colors.ink },
  requirements: { gap: 12, paddingTop: 8 },
  agreement: { gap: 4, borderTopWidth: 1, borderColor: colors.border, paddingTop: 22 },
  linkButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingVertical: 8 },
  link: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.accentInk, textDecorationLine: 'underline' },
  actions: { marginTop: 'auto', paddingTop: 36, gap: 14 },
  fieldError: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.error, marginTop: -10 },
  error: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.error, padding: 16, borderRadius: 16, backgroundColor: colors.errorSoft },
});
