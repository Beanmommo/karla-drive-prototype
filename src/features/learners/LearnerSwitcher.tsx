import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { LearnerAvatar } from './LearnerAvatar';
import { useLearners } from './LearnersProvider';

export function LearnerSwitcher() {
  const { learners, selectedLearner, selectLearner, loading, offline, error, refresh } = useLearners();
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();
  // Reuse the screen's insets so the modal header aligns on its first native mount.
  const insets = useSafeAreaInsets();
  const initiallyLoading = loading && !selectedLearner;
  const canAddDirectly = !initiallyLoading && !learners.length && !error;
  const name = selectedLearner?.name ?? (initiallyLoading ? 'Loading learners…' : error ? 'Choose a learner' : 'Add a learner');

  function trigger(expanded: boolean) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedLearner ? `Learner: ${selectedLearner.name}` : name}
        accessibilityHint={canAddDirectly ? 'Create your first learner' : 'Choose a learner or add another learner'}
        aria-expanded={canAddDirectly ? undefined : expanded}
        aria-busy={initiallyLoading}
        aria-disabled={initiallyLoading}
        disabled={initiallyLoading}
        onPress={() => {
          if (canAddDirectly) {
            setOpen(false);
            router.push('/learners/new');
          } else setOpen(!expanded);
        }}
        style={({ pressed }) => [styles.trigger, (pressed || expanded) && styles.triggerActive]}
      >
        {selectedLearner ? <LearnerAvatar learnerId={selectedLearner.id} size={56} /> : (
          <View style={styles.placeholder}>
            {initiallyLoading ? <ActivityIndicator color={colors.accentInk} /> : <AppIcon name="user" size={28} color={colors.accentInk} />}
          </View>
        )}
        <Text numberOfLines={2} style={styles.name}>{name}</Text>
        {!canAddDirectly && <View style={expanded && styles.chevronOpen}><AppIcon name="chevronDown" size={22} color={colors.muted} /></View>}
      </Pressable>
    );
  }

  return (
    <>
      <View aria-hidden={open}>{trigger(false)}</View>
      {open && <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close learner selection" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View pointerEvents="box-none" style={[styles.safeArea, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
            <View style={styles.dropdownPosition} accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)}>
              {trigger(true)}
              <View style={styles.dropdown}>
                {(offline || error) && (
                  <View style={styles.notice}>
                    <Text accessibilityRole="alert" style={styles.noticeText}>{learners.length ? 'Showing saved learners. Unable to refresh right now.' : error}</Text>
                    <Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={styles.retry}>
                      <Text style={styles.link}>{loading ? 'Refreshing…' : 'Try again'}</Text>
                    </Pressable>
                  </View>
                )}
                {learners.length > 0 && <FlatList
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Learners"
                  data={learners}
                  keyExtractor={(learner) => learner.id}
                  extraData={selectedLearner?.id}
                  style={{ maxHeight: height * 0.45, flexGrow: 0, flexShrink: 1 }}
                  contentContainerStyle={styles.list}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const selected = item.id === selectedLearner?.id;
                    return (
                      <Pressable accessibilityRole="radio" accessibilityLabel={item.name} aria-checked={selected}
                        onPress={() => { selectLearner(item.id); setOpen(false); }}
                        style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressed]}>
                        <LearnerAvatar learnerId={item.id} size={44} />
                        <Text style={styles.optionName}>{item.name}</Text>
                        {selected && <AppIcon name="check" size={21} color={colors.accentInk} />}
                      </Pressable>
                    );
                  }}
                />}
                <View style={[styles.footer, !learners.length && !offline && !error && styles.emptyFooter]}>
                  <Pressable accessibilityRole="button" onPress={() => { setOpen(false); router.push('/learners/new'); }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <View style={styles.addIcon}><AppIcon name="plus" size={23} color={colors.accentInk} /></View>
                    <Text style={styles.addLabel}>{learners.length ? 'Add another learner' : 'Add learner'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 24, backgroundColor: colors.background },
  triggerActive: { backgroundColor: colors.surface },
  placeholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 25, lineHeight: 31, color: colors.ink },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  overlay: { flex: 1, backgroundColor: 'rgba(24, 42, 54, 0.12)' },
  safeArea: { flex: 1 },
  dropdownPosition: { width: '100%', maxWidth: 480, maxHeight: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 8 },
  dropdown: { flexShrink: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, overflow: 'hidden', boxShadow: '0 12px 32px rgba(24, 42, 54, 0.10)' },
  list: { padding: 8 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  selectedRow: { backgroundColor: colors.accentSoft },
  pressed: { backgroundColor: colors.neutralSoft },
  optionName: { flex: 1, fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, color: colors.ink },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, padding: 8 },
  emptyFooter: { borderTopWidth: 0 },
  addIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  addLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, color: colors.accentInk },
  notice: { paddingHorizontal: 20, paddingTop: 4 },
  noticeText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { fontFamily: fonts.medium, fontSize: 16, color: colors.accentInk },
});
