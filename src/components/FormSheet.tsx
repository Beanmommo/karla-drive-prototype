import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '../theme';
import { AppIcon } from './AppIcon';

export function FormSheet({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Close dialog" accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable accessibilityLabel="Close dialog" accessibilityRole="button" onPress={onClose} style={styles.close}>
              <AppIcon name="close" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(24, 42, 54, 0.35)', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '85%', alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 12, paddingTop: 12 },
  title: { flex: 1, fontFamily: fonts.medium, fontSize: 23, color: colors.ink },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingTop: 8, gap: 16 },
});
