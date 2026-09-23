import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { dateToISO, formatBirthDate, parseBirthDate } from '../features/learners/model';
import { colors, fonts } from '../theme';
import { AppIcon } from './AppIcon';
import { FormSheet } from './FormSheet';
import { PrimaryButton } from './PrimaryButton';

export type DateOfBirthFieldProps = { value: string; onChange: (value: string) => void; disabled?: boolean };

export function DateOfBirthField({ value, onChange, disabled }: DateOfBirthFieldProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(new Date());
  const today = new Date();

  function showPicker() {
    const initialDate = parseBirthDate(value) ?? new Date(today.getFullYear() - 16, today.getMonth(), today.getDate(), 12);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate, mode: 'date', maximumDate: today,
        onValueChange: (_, date) => onChange(dateToISO(date)),
      });
    } else {
      setPending(initialDate);
      setOpen(true);
    }
  }

  return (
    <View style={styles.group}>
      <Text style={styles.label}>Date of birth</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Date of birth: ${value ? formatBirthDate(value) : 'Select date'}`}
        disabled={disabled} style={styles.field} onPress={showPicker}>
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatBirthDate(value) : 'Select date of birth'}</Text>
        <AppIcon name="calendar" size={21} color={colors.accentInk} />
      </Pressable>
      {Platform.OS === 'ios' && (
        <FormSheet visible={open} title="Date of birth" onClose={() => setOpen(false)}>
          <DateTimePicker value={pending} onValueChange={(_, date) => setPending(date)} mode="date" display="spinner"
            maximumDate={today} themeVariant="light" locale="en-AU" style={{ width: '100%' }} />
          <PrimaryButton label="Done" fullWidth onPress={() => { onChange(dateToISO(pending)); setOpen(false); }} />
        </FormSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 9 },
  label: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  field: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 18, color: colors.ink },
  placeholder: { color: colors.muted },
});
