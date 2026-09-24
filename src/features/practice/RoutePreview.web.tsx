import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { previewSegments, type Coordinate } from './model';

export function RoutePreview({ points, recorded = false }: { points: Coordinate[]; stops?: Coordinate[]; recorded?: boolean }) {
  if (!points.length) return null;
  const xs = points.map(p => p.longitude); const ys = points.map(p => p.latitude);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.max(...ys), bottom = Math.min(...ys);
  const lines = previewSegments(points, recorded).map(segment => segment.map(p => [15 + (p.longitude - left) / (right - left || 1) * 290,
    15 + (top - p.latitude) / (top - bottom || 1) * 160].join(',')).join(' '));
  return <View style={styles.frame}>
    <Svg viewBox="0 0 320 190" width="100%" height={190} accessibilityLabel="Route trace diagram">
      {lines.map((line, index) => <Polyline key={index} points={line} fill="none" stroke={colors.accentInk} strokeWidth={3} />)}
    </Svg>
    <Text style={styles.caption}>{recorded ? 'Recorded GPS trace' : 'Route preview · Mapbox'} · schematic</Text>
  </View>;
}
const styles = StyleSheet.create({
  frame: { backgroundColor: colors.accentSoft, borderRadius: 20, overflow: 'hidden' },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', padding: 8 },
});
