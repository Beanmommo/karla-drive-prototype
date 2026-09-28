import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { LearnerAvatar } from './LearnerAvatar';
import { useLearners } from './LearnersProvider';

export function LearnerSwitcher({ compact = false, allowAdd = true, learnerId, onSelect }: {
  compact?: boolean;
  allowAdd?: boolean;
  learnerId?: string;
  onSelect?: (learnerId: string) => void;
} = {}) {
  const { learners, selectedLearner, selectLearner, loading, offline, error, refresh } = useLearners();
  const [open, setOpen] = useState(false);
  const triggerContainer = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number } | null>(null);
  const { height } = useWindowDimensions();
  // Reuse the screen's insets so the modal header aligns on its first native mount.
  const insets = useSafeAreaInsets();
  const currentLearner = learnerId === undefined ? selectedLearner : learners.find(learner => learner.id === learnerId);
  const initiallyLoading = loading && !currentLearner;
  const canAddDirectly = allowAdd && !initiallyLoading && !learners.length && !error;
  const name = currentLearner?.name ?? (initiallyLoading ? 'Loading learners…' : canAddDirectly ? 'Add a learner' : 'Choose a learner');

  function openSelection() {
    if (compact) {
      triggerContainer.current?.measureInWindow((x, y, width) => {
        setAnchor({ x, y, width });
        setOpen(true);
      });
    } else setOpen(true);
  }

  function trigger(expanded: boolean) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={currentLearner ? `Learner: ${currentLearner.name}` : name}
        accessibilityHint={canAddDirectly ? 'Create your first learner' : allowAdd ? 'Choose a learner or add another learner' : 'Choose a learner'}
        aria-expanded={canAddDirectly ? undefined : expanded}
        aria-busy={initiallyLoading}
        aria-disabled={initiallyLoading}
        disabled={initiallyLoading}
        onPress={() => {
          if (canAddDirectly) {
            setOpen(false);
            router.push('/learners/new');
          } else if (expanded) setOpen(false);
          else openSelection();
        }}
        hitSlop={compact ? 6 : undefined}
        style={({ pressed }) => [styles.trigger, compact && styles.compactTrigger, (pressed || expanded) && styles.triggerActive]}
      >
        {currentLearner ? <LearnerAvatar learnerId={currentLearner.id} size={compact ? 32 : 56} /> : (
          <View style={[styles.placeholder, compact && styles.compactPlaceholder]}>
            {initiallyLoading ? <ActivityIndicator color={colors.accentInk} /> : <AppIcon name="user" size={28} color={colors.accentInk} />}
          </View>
        )}
        <Text numberOfLines={2} style={[styles.name, compact && styles.compactName]}>{name}</Text>
        {!canAddDirectly && <View style={expanded && styles.chevronOpen}><AppIcon name="chevronDown" size={compact ? 18 : 22} color={colors.muted} /></View>}
      </Pressable>
    );
  }

  return (
    <>
      <View ref={triggerContainer} collapsable={false} aria-hidden={open}>{trigger(false)}</View>
      {open && <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close learner selection" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View pointerEvents="box-none" style={[styles.safeArea, !compact && { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
            <View style={[styles.dropdownPosition, compact && anchor && {
              position: 'absolute', left: anchor.x, top: anchor.y, width: anchor.width,
              maxHeight: Math.max(0, height - anchor.y - insets.bottom - 12),
              paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0,
            }]} accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)}>
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
                  extraData={currentLearner?.id}
                  style={{ maxHeight: height * 0.45, flexGrow: 0, flexShrink: 1 }}
                  contentContainerStyle={styles.list}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const selected = item.id === currentLearner?.id;
                    return (
                      <Pressable accessibilityRole="radio" accessibilityLabel={item.name} aria-checked={selected}
                        onPress={() => { selectLearner(item.id); setOpen(false); onSelect?.(item.id); }}
                        style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressed]}>
                        <LearnerAvatar learnerId={item.id} size={44} />
                        <Text style={styles.optionName}>{item.name}</Text>
                        {selected && <AppIcon name="check" size={21} color={colors.accentInk} />}
                      </Pressable>
                    );
                  }}
                />}
                {allowAdd && <View style={[styles.footer, !learners.length && !offline && !error && styles.emptyFooter]}>
                  <Pressable accessibilityRole="button" onPress={() => { setOpen(false); router.push('/learners/new'); }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <View style={styles.addIcon}><AppIcon name="plus" size={23} color={colors.accentInk} /></View>
                    <Text style={styles.addLabel}>{learners.length ? 'Add another learner' : 'Add learner'}</Text>
                  </Pressable>
                </View>}
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
  compactTrigger: { minHeight: 32, gap: 10, padding: 0, borderRadius: 8 },
  triggerActive: { backgroundColor: colors.surface },
  placeholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  compactPlaceholder: { width: 32, height: 32, borderRadius: 8 },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 25, lineHeight: 31, color: colors.ink },
  compactName: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 22, color: colors.muted },
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
