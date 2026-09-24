import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '../theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({ label, onPress, accessibilityHint, disabled = false, loading = false, fullWidth = false, variant = 'primary' }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, fullWidth && styles.fullWidth,
        disabled && styles.disabled, pressed && styles.pressed, pressed && variant === 'secondary' && styles.secondaryPressed]}
    >
      {loading && <ActivityIndicator color={colors.accentInk} />}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    maxWidth: 260,
    minHeight: 62,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 22,
    borderBottomWidth: 4,
    borderColor: colors.accentEdge,
  },
  fullWidth: { maxWidth: '100%' },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryPressed: { backgroundColor: colors.neutralSoft },
  disabled: { opacity: 0.45 },
  pressed: {
    backgroundColor: colors.accentPressed,
    borderBottomWidth: 2,
    paddingBottom: 18,
    transform: [{ translateY: 2 }],
  },
  label: {
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 20,
    textAlign: 'center',
  },
});
