import { StyleSheet, Text, View } from 'react-native';

import { KarlaLogo } from '../../components/KarlaLogo';
import { MainScreen } from '../../components/MainScreen';
import { colors, fonts } from '../../theme';

export default function HomeScreen() {
  return (
    <MainScreen title="Home">
      <View style={styles.welcome}>
        <KarlaLogo size={144} />
        <Text style={styles.greeting}>Welcome to Karla Drive</Text>
        <Text style={styles.description}>Your driving journey starts here.</Text>
      </View>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
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
