import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { LearnerAvatar } from '../learners/LearnerAvatar';
import { LearnerSwitcher } from '../learners/LearnerSwitcher';
import { useLearners } from '../learners/LearnersProvider';
import type { Learner } from '../learners/model';
import { getModuleStage, getModuleSummary, moduleStatusLabels, type ModuleStageId } from './model';
import { useLearnerModules } from './ModuleStatusesProvider';
import { ModuleStatusEditor } from './ModuleStatusEditor';
import { ModuleStars } from './ModuleStars';
import { StageCarousel } from './StageCarousel';
import { ModuleCoachingTips } from './ModuleCoachingTips';
import { stageAppearance } from './stageAppearance';

function useModuleLearner() {
  const { learnerId, moduleId, stageId } = useLocalSearchParams<{ learnerId?: string; moduleId?: string; stageId?: string }>();
  const { learners, loading, error, refresh } = useLearners();
  // Resolve only within the signed-in account; never fall back to another learner.
  const learner = learners.find((item) => item.id === learnerId);
  return { learner, moduleId, stageId, loading, error, refresh };
}

function ModulePage({ title, stageId, onBack, backLabel, children }: {
  title: string; stageId?: ModuleStageId; onBack: () => void; backLabel: string; children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <AppIcon name="back" size={23} />
        </Pressable>
        {stageId && <View aria-hidden style={[styles.headerStageIcon, { backgroundColor: stageAppearance[stageId].color }]}>
          <AppIcon name={stageAppearance[stageId].icon} size={22} strokeWidth={1.6} />
        </View>}
        <Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

function LearnerIdentity({ learner }: { learner: Learner }) {
  return (
    <View style={styles.identity}>
      <LearnerAvatar learnerId={learner.id} size={32} />
      <Text style={styles.learnerName}>{learner.name}</Text>
    </View>
  );
}

function UnavailableLearner({ loading, error, refresh }: {
  loading: boolean; error: string | null; refresh: () => Promise<void>;
}) {
  return (
    <View style={styles.empty}>
      {loading && <ActivityIndicator color={colors.accentInk} />}
      <Text style={styles.emptyTitle}>{loading ? 'Loading learner…' : error ? 'Could not load this learner' : 'Learner unavailable'}</Text>
      {!loading && <Text style={styles.body}>{error ?? 'Return to Home to choose a learner.'}</Text>}
      {!loading && !!error && (
        <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

function AssessmentNotice({ assessments }: { assessments: ReturnType<typeof useLearnerModules> }) {
  if (assessments.error) return <View style={styles.notice}>
    <Text accessibilityRole="alert" style={styles.body}>{assessments.loaded ? 'Showing saved ratings. ' : ''}{assessments.error}</Text>
    <Pressable accessibilityRole="button" onPress={() => void assessments.refresh()} style={styles.retry}>
      <Text style={styles.retryText}>Retry ratings</Text>
    </Pressable>
  </View>;
  if (!assessments.loaded) return <Text style={styles.body}>Loading ratings…</Text>;
  return null;
}

function backToHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

function StarTotal({ stars, maxStars, loaded }: { stars: number; maxStars: number; loaded: boolean }) {
  return <View accessible accessibilityLabel={`${loaded ? stars : 'unavailable'} of ${maxStars} stars`} style={styles.starTotal}>
    <AppIcon name="star" size={20} color={colors.star} fill={colors.starFill} />
    <Text style={styles.totalCount}>{loaded ? stars : '—'} <Text style={styles.totalMax}>/ {maxStars}</Text></Text>
  </View>;
}

export function ModulesScreen() {
  const { learner, loading, error, refresh } = useModuleLearner();
  const assessments = useLearnerModules(learner);
  return <ModulePage title="Modules" onBack={backToHome} backLabel="Back to Home">
    {!learner ? <UnavailableLearner loading={loading} error={error} refresh={refresh} /> : (
      <ScrollView contentContainerStyle={styles.stagesContent}>
        {(!assessments.loaded || assessments.error) && <View style={styles.stageNotice}>
          <AssessmentNotice assessments={assessments} />
        </View>}
        <StageCarousel key={learner.id} modules={assessments.modules} loaded={assessments.loaded}
          onSelect={stageId => router.push({ pathname: '/learners/[learnerId]/modules/stages/[stageId]',
            params: { learnerId: learner.id, stageId: String(stageId) } })} />
      </ScrollView>
    )}
  </ModulePage>;
}

export function StageModulesScreen() {
  const { learner, stageId, loading, error, refresh } = useModuleLearner();
  const assessments = useLearnerModules(learner);
  const stage = getModuleStage(stageId);
  const modules = assessments.modules.filter(module => module.stage === stage?.id);
  function goBack() {
    if (router.canGoBack()) router.back();
    else if (learner) router.replace({ pathname: '/learners/[learnerId]/modules', params: { learnerId: learner.id } });
    else router.replace('/home');
  }
  return <ModulePage title={stage?.title ?? 'Stage unavailable'} stageId={stage?.id} onBack={goBack} backLabel="Back to stages">
    {!learner ? <UnavailableLearner loading={loading} error={error} refresh={refresh} /> : !stage ? (
      <View style={styles.empty}><Text style={styles.body}>Choose one of the four stages to view its modules.</Text></View>
    ) : <FlatList data={modules} keyExtractor={item => item.id} contentContainerStyle={styles.listContent}
      ListHeaderComponent={<View style={styles.introduction}>
        <LearnerSwitcher compact allowAdd={false} learnerId={learner.id}
          onSelect={learnerId => {
            if (learnerId !== learner.id) router.setParams({ learnerId });
          }} />
        <StarTotal {...getModuleSummary(modules)} loaded={assessments.loaded} />
        <AssessmentNotice assessments={assessments} />
      </View>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item, index }) => <Pressable accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${assessments.loaded ? moduleStatusLabels[item.status] : 'Rating unavailable'}`}
        accessibilityHint="View module details and update its star rating"
        onPress={() => router.push({ pathname: '/learners/[learnerId]/modules/[moduleId]', params: { learnerId: learner.id, moduleId: item.id } })}
        style={({ pressed }) => [styles.moduleRow, pressed && styles.pressed]}>
        <View aria-hidden style={styles.rowContents}>
          <View style={styles.moduleNumber}><Text style={styles.moduleNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <View style={styles.rowText}>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            {assessments.loaded ? <ModuleStars status={item.status} showCount={false} /> : <Text style={styles.body}>—</Text>}
          </View>
          <AppIcon name="chevronRight" size={20} color={colors.muted} />
        </View>
      </Pressable>} />}
  </ModulePage>;
}

export function ModuleDetailScreen() {
  const { learner, moduleId, loading, error, refresh } = useModuleLearner();
  const assessments = useLearnerModules(learner);
  const module = assessments.modules.find((item) => item.id === moduleId);
  function goBack() {
    if (router.canGoBack()) router.back();
    else if (learner && module) router.replace({ pathname: '/learners/[learnerId]/modules/stages/[stageId]', params: { learnerId: learner.id, stageId: String(module.stage) } });
    else if (learner) router.replace({ pathname: '/learners/[learnerId]/modules', params: { learnerId: learner.id } });
    else router.replace('/home');
  }

  return (
    <ModulePage title="Module details" onBack={goBack} backLabel="Back to modules">
      {!learner ? <UnavailableLearner loading={loading} error={error} refresh={refresh} /> : !module ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Module unavailable</Text>
          <Text style={styles.body}>Return to the module list to choose a module.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.detailContent}>
          <LearnerIdentity learner={learner} />
          <View style={styles.detailIntro}>
            <Text style={styles.totalLabel}>Stage {module.stage}</Text>
            <View style={styles.detailHeading}>
              <View style={styles.detailIcon}><AppIcon name="modules" size={30} color={colors.accentInk} /></View>
              <Text accessibilityRole="header" style={styles.detailTitle}>{module.title}</Text>
            </View>
            <Text style={styles.body}>{module.description}</Text>
          </View>
          <AssessmentNotice assessments={assessments} />
          {assessments.loaded && <ModuleStatusEditor
            key={`${learner.account_id}:${learner.id}:${module.id}`}
            status={module.status}
            updatedAt={assessments.records.find((record) => record.module_id === module.id)?.updated_at}
            saving={assessments.saving}
            onSave={(status) => assessments.save(module.id, status)}
          />}
          <View style={styles.detailCard}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>What to practise</Text>
            {module.focus.map((focus) => (
              <View key={focus} style={styles.focusRow}>
                <View style={styles.bullet} />
                <Text style={[styles.body, styles.focusText]}>{focus}</Text>
              </View>
            ))}
          </View>
          <View style={styles.detailCard}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Supervisor coaching tips</Text>
            <ModuleCoachingTips module={module} />
          </View>
        </ScrollView>
      )}
    </ModulePage>
  );
}

const styles = StyleSheet.create({
  notice: { gap: 4 },
  stagesContent: { flexGrow: 1, justifyContent: 'center', width: '100%', paddingVertical: 24, gap: 16 },
  stageNotice: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 },
  starTotal: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.starSoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  totalLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  totalCount: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.ink },
  totalMax: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  screen: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 480, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  pressed: { backgroundColor: colors.accentSoft },
  headerTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  headerStageIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listContent: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  introduction: { gap: 16, paddingTop: 12, paddingBottom: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  learnerName: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.muted },
  separator: { height: 10 },
  moduleRow: { borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 16 },
  rowContents: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleNumber: { alignSelf: 'flex-start', minWidth: 34, minHeight: 34, padding: 5, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  moduleNumberText: { fontFamily: fonts.medium, fontSize: 15, color: colors.accentInk },
  rowText: { flex: 1, gap: 8 },
  moduleTitle: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 23, color: colors.ink },
  detailContent: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32, gap: 24 },
  detailIntro: { gap: 16 },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  detailIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 30, lineHeight: 38, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 25, color: colors.muted },
  detailCard: { padding: 20, gap: 14, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  focusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentEdge, marginTop: 10 },
  focusText: { flex: 1 },
  empty: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  retry: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12 },
  retryText: { fontFamily: fonts.medium, fontSize: 17, color: colors.accentInk },
});
