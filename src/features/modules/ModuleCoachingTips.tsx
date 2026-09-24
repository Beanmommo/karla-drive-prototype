import { StyleSheet, Text } from 'react-native';

import { colors, fonts } from '../../theme';
import { getModuleCoachingTip, type LearningModule } from './model';

export function ModuleCoachingTips({ module }: { module: LearningModule }) {
  // TODO: Add supervisor coaching materials as coachingTip on each catalogue entry.
  // Render the same materials here on module details and during practice, where
  // only Need practice / Not performed modules are shown. These are prompts for
  // the supervisor to coach the learner; assessment happens after the drive.
  const tip = getModuleCoachingTip(module);
  return <Text accessibilityLabel={tip ? undefined : `Coaching tips for ${module.title} are coming soon.`} style={styles.placeholder}>
    {tip ?? 'Coaching tips coming soon.'}
  </Text>;
}

const styles = StyleSheet.create({
  placeholder: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
});
