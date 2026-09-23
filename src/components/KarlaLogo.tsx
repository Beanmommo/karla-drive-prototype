import { Image, StyleSheet, View } from 'react-native';

// Frame the visible artwork without changing the original transparent asset.
// The source is 1254px square; the mascot occupies this 689 × 650px region.
const artwork = { x: 304, y: 316, width: 689, height: 650, canvas: 1254 };

export function KarlaLogo({ size = 208 }: { size?: number }) {
  const scale = size / artwork.width;

  return (
    <View
      accessibilityLabel="Koala driving a blue car"
      accessibilityRole="image"
      accessible
      style={[styles.frame, { width: size, height: artwork.height * scale }]}
    >
      <Image
        accessible={false}
        source={require('../../assets/koala-driving-logo-v5.png')}
        fadeDuration={0}
        style={{
          position: 'absolute',
          width: artwork.canvas * scale,
          height: artwork.canvas * scale,
          left: -artwork.x * scale,
          top: -artwork.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
