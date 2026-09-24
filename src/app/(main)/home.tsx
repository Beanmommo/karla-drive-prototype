import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearnerSwitcher } from '../../features/learners/LearnerSwitcher';
import { LearnerPracticeStats } from '../../features/learners/LearnerPracticeStats';
import { useLearners } from '../../features/learners/LearnersProvider';
import { LearnerModulesSummary } from '../../features/modules/LearnerModulesSummary';
import { PracticeSummary } from '../../features/practice/PracticeSummary';
import { colors } from '../../theme';

export default function HomeScreen() {
  const { selectedLearner } = useLearners();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <LearnerSwitcher />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {selectedLearner && (
          <>
            <LearnerPracticeStats
              key={`${selectedLearner.account_id}:${selectedLearner.id}`}
              learner={selectedLearner}
            />
            <LearnerModulesSummary learner={selectedLearner} />
            <PracticeSummary learner={selectedLearner} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32, gap: 24 },
});
