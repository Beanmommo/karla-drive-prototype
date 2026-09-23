import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import type { Learner } from '../learners/model';
import { useLearnerModules } from './ModuleStatusesProvider';

export function LearnerModulesSummary({ learner }: { learner: Learner }) {
  const { summary: { excellent, total }, loaded, error } = useLearnerModules(learner);
  const count = loaded ? String(excellent) : error ? '—' : '…';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loaded ? `Modules, ${excellent} of ${total}${error ? ', saved statuses' : ''}` : `Modules, ${error ? 'status unavailable' : 'loading'}`}
      accessibilityHint="View all modules and their status"
      onPress={() => router.push({ pathname: '/learners/[learnerId]/modules', params: { learnerId: learner.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View aria-hidden style={styles.contents}>
        <View style={styles.icon}><AppIcon name="modules" color={colors.accentInk} /></View>
        <Text style={styles.title}>Modules</Text>
        <Text style={styles.count}>{count}/{total}</Text>
        <AppIcon name="chevronRight" size={22} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20 },
  pressed: { backgroundColor: colors.accentSoft },
  contents: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  icon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flexGrow: 1, fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  count: { fontFamily: fonts.medium, fontSize: 23, color: colors.accentInk },
});
