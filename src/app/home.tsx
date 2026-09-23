import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KarlaLogo } from '../components/KarlaLogo';
import { colors, fonts } from '../theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <Text accessibilityRole="header" style={styles.title}>Home</Text>
        <View style={styles.welcome}>
          <KarlaLogo size={144} />
          <Text style={styles.greeting}>Welcome to Karla Drive</Text>
          <Text style={styles.description}>Your driving journey starts here.</Text>
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.semibold,
    fontSize: 34,
  },
  welcome: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  greeting: {
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
