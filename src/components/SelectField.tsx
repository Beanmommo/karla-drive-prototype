import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';
import { AppIcon } from './AppIcon';
import { FormSheet } from './FormSheet';
import { PrimaryButton } from './PrimaryButton';

export function SelectField({ label, placeholder, value, options, onChange, disabled = false }: {
  label: string; placeholder: string; value: string;
  disabled?: boolean;
  options: { label: string; value: string }[]; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value);
  const picker = (selection: string, onSelect: (value: string) => void) => (
    <Picker
      accessibilityLabel={label}
      selectedValue={selection}
      enabled={!disabled}
      onValueChange={onSelect}
      mode="dropdown"
      dropdownIconColor={colors.accentInk}
      style={[styles.picker, !selection && styles.placeholder]}
      itemStyle={styles.pickerItem}
    >
      <Picker.Item label={placeholder} value="" color={colors.muted} />
      {options.map((option) => <Picker.Item key={option.value} label={option.label} value={option.value} color={colors.ink} />)}
    </Picker>
  );

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${options.find((option) => option.value === value)?.label ?? placeholder}`}
            disabled={disabled} accessibilityState={{ disabled }}
            accessibilityHint={`Choose ${label.toLowerCase()}`} style={styles.field}
            onPress={() => { setPending(value); setOpen(true); }}>
            <Text style={[styles.value, !value && styles.placeholder]}>{options.find((option) => option.value === value)?.label ?? placeholder}</Text>
            <AppIcon name="chevronDown" size={20} color={colors.accentInk} />
          </Pressable>
          <FormSheet visible={open} title={`Select ${label.toLowerCase()}`} onClose={() => setOpen(false)}>
            {picker(pending, setPending)}
            <PrimaryButton label="Done" fullWidth onPress={() => { onChange(pending); setOpen(false); }} />
          </FormSheet>
        </>
      ) : <View style={styles.pickerField}>{picker(value, onChange)}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 9 },
  label: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  field: { minHeight: 60, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 18, color: colors.ink },
  placeholder: { color: colors.muted },
  pickerField: { minHeight: 60, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden' },
  picker: { minHeight: 58, width: '100%', borderWidth: 0, paddingHorizontal: 14, backgroundColor: colors.surface, fontFamily: fonts.regular, fontSize: 18, color: colors.ink },
  pickerItem: { color: colors.ink, fontFamily: fonts.regular, fontSize: 20 },
});
