import { Checkbox } from 'expo-checkbox';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export function RequirementCheckbox({ title, description, checked, onChange, disabled }: {
  title: string; description?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityState={{ checked, disabled }} aria-checked={checked} aria-disabled={disabled}
      disabled={disabled} onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, checked && styles.selected, pressed && styles.pressed]}>
      <View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Checkbox value={checked} color={checked ? colors.accentInk : colors.neutralBorder} style={styles.checkbox} tabIndex={-1} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, minHeight: 60, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.accent, backgroundColor: '#F1F9FF' },
  pressed: { opacity: 0.75 },
  checkbox: { width: 24, height: 24, borderRadius: 6, marginTop: 1 },
  copy: { flex: 1, gap: 5 },
  title: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  description: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted },
});
