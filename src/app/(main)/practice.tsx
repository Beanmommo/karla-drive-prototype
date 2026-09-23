import { StyleSheet, Text, View } from 'react-native';

import { MainScreen } from '../../components/MainScreen';
import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';

export default function PracticeScreen() {
  return (
    <MainScreen title="Practice">
      <View style={styles.placeholder}>
        <View
          style={styles.illustration}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <AppIcon name="car" size={64} />
        </View>
        <Text style={styles.title}>One drive at a time</Text>
        <Text style={styles.description}>Your practice sessions will live here.</Text>
      </View>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 26,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
});
