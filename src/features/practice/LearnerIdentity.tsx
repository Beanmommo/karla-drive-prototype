import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme';
import { LearnerAvatar } from '../learners/LearnerAvatar';

export function LearnerIdentity({ id, name }: { id: string; name: string }) {
  return <View style={styles.identity}>
    <LearnerAvatar learnerId={id} size={38} />
    <Text numberOfLines={1} style={styles.name}>{name}</Text>
  </View>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 19, color: colors.ink },
});
