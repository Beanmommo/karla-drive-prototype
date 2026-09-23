import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { MainScreen } from '../../components/MainScreen';
import { colors, fonts } from '../../theme';

export default function AccountScreen() {
  return (
    <MainScreen title="Account">
      <View style={styles.placeholder}>
        <Avatar size={96} />
        <Text style={styles.title}>Demo account</Text>
        <Text style={styles.description}>Your profile will live here.</Text>
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
