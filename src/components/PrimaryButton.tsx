import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '../theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
};

export function PrimaryButton({ label, onPress, accessibilityHint }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
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
