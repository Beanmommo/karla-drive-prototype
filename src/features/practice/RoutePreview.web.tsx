import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { previewSegments, type Coordinate } from './model';
import { trailViewport } from './trailViewport';

export function RoutePreview({ points, recorded = false, compact = false }: { points: Coordinate[]; stops?: Coordinate[]; recorded?: boolean; compact?: boolean }) {
  const [failedMap, setFailedMap] = useState<string | null>(null);
  const viewport = useMemo(() => trailViewport(points), [points]);
  const lines = useMemo(() => viewport ? previewSegments(points, recorded)
    .map(segment => segment.map(p => viewport.project(p).join(',')).join(' ')) : [], [points, recorded, viewport]);
  if (!viewport) return null;
  const mapId = viewport.tiles.map(tile => tile.id).join(',');
  const showMap = failedMap !== mapId;
  const [startX, startY] = viewport.project(points[0]);
  return <View pointerEvents={compact ? 'none' : 'auto'} style={compact ? styles.compactFrame : styles.frame}>
    <View style={compact ? StyleSheet.absoluteFill : styles.map}>
      {showMap && viewport.tiles.map(tile => <Image key={tile.id} source={{ uri: tile.url }}
        style={{ position: 'absolute', left: `${tile.x / 320 * 100}%`, top: `${tile.y / 190 * 100}%`,
          width: `${tile.size / 320 * 100}%`, height: `${tile.size / 190 * 100}%` }}
        onError={() => setFailedMap(mapId)} />)}
      <Svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" width="100%" height="100%"
        style={StyleSheet.absoluteFill} accessibilityLabel="GPS trail on a street map">
        {lines.map((line, index) => <Polyline key={index} points={line} fill="none" stroke={colors.accentInk} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />)}
        <Circle cx={startX} cy={startY} r={5} fill={colors.accentInk} stroke={colors.surface} strokeWidth={2} />
      </Svg>
      {showMap && <Text style={styles.attribution}>© OpenStreetMap contributors · openstreetmap.org/copyright</Text>}
    </View>
    {!compact && <Text style={styles.caption}>{recorded ? 'Recorded GPS trace' : 'Route preview'}{!showMap ? ' · Map unavailable' : ''}</Text>}
    {compact && !showMap && <Text style={styles.mapUnavailable}>Map unavailable</Text>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { backgroundColor: colors.accentSoft, borderRadius: 20, overflow: 'hidden' },
  compactFrame: { flex: 1, backgroundColor: colors.accentSoft, overflow: 'hidden' },
  map: { width: '100%', aspectRatio: 320 / 190, overflow: 'hidden' },
  attribution: { position: 'absolute', bottom: 0, right: 0, padding: 2, backgroundColor: '#FFFFFFE6', fontSize: 8, color: colors.ink },
  mapUnavailable: { position: 'absolute', bottom: 5, alignSelf: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', padding: 8 },
});
