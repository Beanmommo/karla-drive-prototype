import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { LearnerAvatar } from '../learners/LearnerAvatar';
import { useLearners } from '../learners/LearnersProvider';
import type { Learner } from '../learners/model';
import { moduleStatusLabels } from './model';
import { useLearnerModules } from './ModuleStatusesProvider';
import { ModuleStatusEditor } from './ModuleStatusEditor';
import { ModuleStatusBadge } from './ModuleStatusBadge';
import { ModuleCoachingTips } from './ModuleCoachingTips';

function useModuleLearner() {
  const { learnerId, moduleId } = useLocalSearchParams<{ learnerId?: string; moduleId?: string }>();
  const { learners, loading, error, refresh } = useLearners();
  // Resolve only within the signed-in account; never fall back to another learner.
  const learner = learners.find((item) => item.id === learnerId);
  return { learner, moduleId, loading, error, refresh };
}

function ModulePage({ title, onBack, backLabel, children }: {
  title: string; onBack: () => void; backLabel: string; children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <AppIcon name="back" size={23} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
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
    <Text accessibilityRole="alert" style={styles.body}>{assessments.loaded ? 'Showing saved statuses. ' : ''}{assessments.error}</Text>
    <Pressable accessibilityRole="button" onPress={() => void assessments.refresh()} style={styles.retry}>
      <Text style={styles.retryText}>Retry statuses</Text>
    </Pressable>
  </View>;
  if (!assessments.loaded) return <Text style={styles.body}>Loading statuses…</Text>;
  return null;
}

function backToHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

export function ModulesScreen() {
  const { learner, loading, error, refresh } = useModuleLearner();
  const assessments = useLearnerModules(learner);
  const { modules, summary } = assessments;

  return (
    <ModulePage title="Modules" onBack={backToHome} backLabel="Back to Home">
      {!learner ? <UnavailableLearner loading={loading} error={error} refresh={refresh} /> : (
        <FlatList
          data={modules}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.introduction}>
              <LearnerIdentity learner={learner} />
              <View style={styles.listHeading}>
                <Text accessibilityRole="header" style={styles.pageTitle}>Your modules</Text>
                <Text style={styles.summary}>{assessments.loaded ? summary.excellent : assessments.error ? '—' : '…'}/{summary.total}</Text>
              </View>
              <AssessmentNotice assessments={assessments} />
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${assessments.loaded ? moduleStatusLabels[item.status] : 'Status unavailable'}`}
              accessibilityHint="View module details"
              onPress={() => router.push({
                pathname: '/learners/[learnerId]/modules/[moduleId]',
                params: { learnerId: learner.id, moduleId: item.id },
              })}
              style={({ pressed }) => [styles.moduleRow, pressed && styles.pressed]}
            >
              <View aria-hidden style={styles.rowContents}>
                <View style={styles.moduleNumber}><Text style={styles.moduleNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <View style={styles.rowText}>
                  <Text style={styles.moduleTitle}>{item.title}</Text>
                  {assessments.loaded ? <ModuleStatusBadge status={item.status} /> : <Text style={styles.body}>{assessments.error ? 'Status unavailable' : 'Loading…'}</Text>}
                </View>
                <AppIcon name="chevronRight" size={20} color={colors.muted} />
              </View>
            </Pressable>
          )}
        />
      )}
    </ModulePage>
  );
}

export function ModuleDetailScreen() {
  const { learner, moduleId, loading, error, refresh } = useModuleLearner();
  const assessments = useLearnerModules(learner);
  const module = assessments.modules.find((item) => item.id === moduleId);
  function goBack() {
    if (router.canGoBack()) router.back();
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
  screen: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 480, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  pressed: { backgroundColor: colors.accentSoft },
  headerTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  listContent: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  introduction: { gap: 24, paddingTop: 12, paddingBottom: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  learnerName: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.muted },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pageTitle: { flexGrow: 1, fontFamily: fonts.medium, fontSize: 28, color: colors.ink },
  summary: { fontFamily: fonts.medium, fontSize: 22, color: colors.accentInk },
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
