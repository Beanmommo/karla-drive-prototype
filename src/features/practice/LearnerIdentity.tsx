import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme';
import { LearnerAvatar } from '../learners/LearnerAvatar';

export function LearnerIdentity({ id, name }: { id: string; name: string }) {
  return <View style={styles.identity}>
    <LearnerAvatar learnerId={id} size={38} />
    <View style={styles.copy}>
      <Text style={styles.eyebrow}>SUPERVISING</Text>
      <Text numberOfLines={1} style={styles.name}>{name}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1, color: colors.muted },
  name: { fontFamily: fonts.medium, fontSize: 19, color: colors.ink },
});
