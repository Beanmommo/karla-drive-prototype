import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors, fonts } from '../../theme';
import { previewSegments, type Coordinate } from './model';

export function RoutePreview({ points, stops = [], recorded = false }: { points: Coordinate[]; stops?: Coordinate[]; recorded?: boolean }) {
  const map = useRef<MapView>(null);
  const segments = previewSegments(points, recorded);
  const displayed = segments.flat();
  if (!points.length) return null;
  return <View style={styles.frame}>
    <MapView ref={map} style={styles.map} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
      initialRegion={{ ...points[0], latitudeDelta: 0.025, longitudeDelta: 0.025 }}
      onMapReady={() => map.current?.fitToCoordinates(displayed, { edgePadding: { top: 35, left: 30, right: 30, bottom: 35 }, animated: false })}
      accessibilityLabel={recorded ? 'Recorded practice route' : 'Generated driving loop preview'}>
      {segments.filter(segment => segment.length > 1).map((segment, index) => <Polyline key={index} coordinates={segment} strokeWidth={4} strokeColor={colors.accentInk} />)}
      <Marker coordinate={points[0]} title={recorded ? 'Start' : 'Start and finish'} pinColor={colors.accentInk} />
      {stops.map((stop, index) => <Marker key={index} coordinate={stop} title={'Stop ' + (index + 1)} />)}
    </MapView>
    <Text style={styles.credit}>{recorded ? 'Recorded GPS trace · gaps may be present' : 'Route calculated by Mapbox · navigation by Apple Maps'}</Text>
  </View>;
}
const styles = StyleSheet.create({
  frame: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { height: 210, width: '100%' },
  credit: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, backgroundColor: colors.surface, padding: 8, textAlign: 'center' },
});
