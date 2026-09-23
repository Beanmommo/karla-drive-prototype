import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

export function TabIcon({
  focused,
  prominent = false,
  children,
}: {
  focused: boolean;
  prominent?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.icon,
        focused && styles.selected,
        prominent && styles.prominent,
        prominent && focused && styles.prominentSelected,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 48,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.neutralSoft,
  },
  prominent: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingLeft: 2,
  },
  prominentSelected: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentEdge,
  },
});
