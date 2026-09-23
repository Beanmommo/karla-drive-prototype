import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { moduleStatusLabels, type ModuleStatus } from './model';
import { moduleStatusColors } from './statusColors';

export function ModuleStatusEditor({ status, updatedAt, saving, onSave }: {
  status: ModuleStatus; updatedAt?: string; saving: boolean;
  onSave: (status: ModuleStatus) => Promise<void>;
}) {
  const [pendingStatus, setPendingStatus] = useState<ModuleStatus | null>(null);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const busy = saving || pendingStatus !== null;
  const choice = pendingStatus ?? status;

  async function selectStatus(value: ModuleStatus) {
    if (savingRef.current || saving || value === status) return;
    savingRef.current = true;
    setPendingStatus(value);
    setError(null);
    try {
      await onSave(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this status. Please try again.');
    } finally {
      savingRef.current = false;
      setPendingStatus(null);
    }
  }
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Current status</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Module status" style={styles.options}>
        {(Object.keys(moduleStatusLabels) as ModuleStatus[]).map((value) => {
          const selected = choice === value;
          const tone = moduleStatusColors[value];
          return (
            <Pressable key={value} accessibilityRole="radio" accessibilityLabel={moduleStatusLabels[value]}
              accessibilityState={{ checked: selected, disabled: busy, busy: busy && selected }} disabled={busy}
              onPress={() => void selectStatus(value)}
              style={({ pressed }) => [
                styles.option,
                (selected || pressed) && { backgroundColor: tone.backgroundColor },
                selected && { borderColor: tone.color },
                busy && styles.dimmed,
              ]}>
              <View style={[styles.radio, selected && { borderColor: tone.color, backgroundColor: tone.color }]}>
                {selected && <AppIcon name="check" size={15} color={colors.surface} />}
              </View>
              <Text style={[styles.optionText, selected && { color: tone.color }]}>{moduleStatusLabels[value]}</Text>
            </Pressable>
          );
        })}
      </View>
      {(busy || updatedAt) && <Text accessibilityLiveRegion="polite" style={styles.note}>
        {busy ? 'Saving…' : `Updated ${new Date(updatedAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
      </Text>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 14, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.muted },
  options: { gap: 8 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  dimmed: { opacity: 0.6 },
  error: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.error },
});
