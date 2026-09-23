import { StyleSheet, Text, View } from 'react-native';

import { dateToISO } from '../features/learners/model';
import { colors, fonts } from '../theme';

type DateOfBirthFieldProps = { value: string; onChange: (value: string) => void; disabled?: boolean };

export function DateOfBirthField({ value, onChange, disabled }: DateOfBirthFieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Date of birth</Text>
      <input aria-label="Date of birth" type="date" value={value} max={dateToISO(new Date())}
        disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)}
        style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, height: 60, padding: '0 18px', border: `1px solid ${colors.border}`, borderRadius: 16,
          backgroundColor: colors.surface, color: colors.ink, fontFamily: fonts.regular, fontSize: 18, colorScheme: 'light' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 9 },
  label: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
});
