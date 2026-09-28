import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors, fonts } from '../../theme';
import { previewSegments, type Coordinate } from './model';
import { trailBounds } from './trailBounds';

export function RoutePreview({ points, stops = [], recorded = false, compact = false }: { points: Coordinate[]; stops?: Coordinate[]; recorded?: boolean; compact?: boolean }) {
  const map = useRef<MapView>(null);
  const ready = useRef(false);
  const segments = useMemo(() => previewSegments(points, recorded), [points, recorded]);
  const bounds = useMemo(() => trailBounds(points), [points]);
  const fitTrail = useCallback(() => {
    if (!ready.current || !bounds.length) return;
    map.current?.fitToCoordinates(bounds, { edgePadding: { top: 35, left: 24, right: 24, bottom: 24 }, animated: false });
  }, [bounds]);
  useEffect(fitTrail, [fitTrail]);
  if (!points.length) return null;
  return <View pointerEvents={compact ? 'none' : 'auto'} style={compact ? styles.compactFrame : styles.frame}>
    <MapView ref={map} style={compact ? styles.compactMap : styles.map} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      mapType="standard" userInterfaceStyle="light"
      zoomTapEnabled={false} toolbarEnabled={false} liteMode={compact}
      initialRegion={{ ...points[0], latitudeDelta: 0.025, longitudeDelta: 0.025 }}
      onMapReady={() => { ready.current = true; fitTrail(); }} onLayout={fitTrail}
      accessibilityLabel={recorded ? 'Recorded practice route' : 'Generated driving loop preview'}>
      {segments.filter(segment => segment.length > 1).map((segment, index) => <Polyline key={index} coordinates={segment} strokeWidth={4} strokeColor={colors.accentInk} />)}
      <Marker coordinate={points[0]} title={recorded ? 'Start' : 'Start and finish'} pinColor={colors.accentInk} />
      {stops.map((stop, index) => <Marker key={index} coordinate={stop} title={'Stop ' + (index + 1)} />)}
    </MapView>
    {!compact && <Text style={styles.credit}>{recorded ? 'Recorded GPS trace · gaps may be present' : 'Route calculated by Mapbox · navigation by Apple Maps'}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 210, width: '100%' },
  compactFrame: { flex: 1, overflow: 'hidden' },
  compactMap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  credit: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, backgroundColor: colors.surface, padding: 8, textAlign: 'center' },
});
