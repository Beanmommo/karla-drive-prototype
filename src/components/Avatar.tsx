import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { AppIcon } from './AppIcon';

export function Avatar({ size = 32, tone = 'blue' }: { size?: number; tone?: 'blue' | 'neutral' }) {
  return (
    <View
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        tone === 'neutral' && styles.neutral,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <AppIcon name="user" size={size * 0.56} color={tone === 'neutral' ? colors.muted : colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  neutral: {
    backgroundColor: colors.neutralSoft,
    borderColor: colors.neutralBorder,
  },
});
