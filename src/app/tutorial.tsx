import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KarlaLogo } from '../components/KarlaLogo';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, fonts } from '../theme';

export default function TutorialScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.introduction}>
          <Text accessibilityRole="header" style={styles.title}>
            What is Karla Drive?
          </Text>
          <Text style={styles.description}>
            Karla is here to facilitate Victorian families teaching the young ones to drive.
          </Text>
        </View>

        <View style={styles.illustration}>
          <KarlaLogo size={220} />
        </View>

        <PrimaryButton
          label="I see"
          accessibilityHint="Continue to the homepage"
          onPress={() => router.replace('/home')}
        />
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 32,
  },
  introduction: {
    width: '100%',
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 34,
    textAlign: 'center',
  },
  description: {
    marginTop: 16,
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 20,
    lineHeight: 30,
    textAlign: 'center',
  },
  illustration: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
