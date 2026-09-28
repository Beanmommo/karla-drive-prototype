import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme';
import type { ModuleStatus } from './model';
import { ModuleRatingInput } from './ModuleStars';

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
      setError(cause instanceof Error ? cause.message : 'Could not save this rating. Please try again.');
    } finally {
      savingRef.current = false;
      setPendingStatus(null);
    }
  }
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>Module rating</Text>
      <ModuleRatingInput status={choice} disabled={busy} onChange={value => void selectStatus(value)} />
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
  error: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.error },
});
