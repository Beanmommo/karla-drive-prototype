import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '../../theme';
import { moduleStatusLabels, type ModuleStatus } from './model';
import { moduleStatusColors } from './statusColors';

export function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  const tone = moduleStatusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]}>{moduleStatusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
});
