import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KarlaLogo } from '../components/KarlaLogo';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, fonts } from '../theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.welcome}>
          <KarlaLogo />
          <Text accessibilityRole="header" style={styles.title}>
            Karla Drive
          </Text>

          <View style={styles.action}>
            <PrimaryButton
              label="Demo access"
              accessibilityHint="Learn what Karla Drive is about"
              onPress={() => router.navigate('/tutorial')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  welcome: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    marginTop: 24,
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 44,
    textAlign: 'center',
  },
  action: {
    width: '100%',
    marginTop: 40,
    alignItems: 'center',
  },
});
