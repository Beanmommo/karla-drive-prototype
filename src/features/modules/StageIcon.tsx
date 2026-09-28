import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import type { ModuleStageId } from './model';

const illustrations = {
  1: require('../../../assets/stage-1-car-control-tall.png'),
  2: require('../../../assets/stage-2-basic-drives.png'),
  3: require('../../../assets/stage-3-complex-drives.png'),
  4: require('../../../assets/stage-4-rehearsing-solo-v2.png'),
} satisfies Record<ModuleStageId, ImageSourcePropType>;

export function StageIcon({ stageId, size }: { stageId: ModuleStageId; size: number }) {
  // Frame the artwork consistently, trimming only the PNGs' transparent margins.
  const imageSize = size * (stageId === 1 ? 1.25 : 1.4);
  return <View style={[styles.illustration, { width: size, height: size }]}>
    <Image accessible={false} source={illustrations[stageId]}
      resizeMode="contain" fadeDuration={0} style={{ width: imageSize, height: imageSize }} />
  </View>;
}

const styles = StyleSheet.create({
  illustration: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
