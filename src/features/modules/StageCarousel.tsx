import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { getModuleSummary, moduleStages, type LearnerModule, type ModuleStageId } from './model';

const stageColors = ['#E4F4FE', '#E5F5EB', '#F0E9FC', '#FFF0DC'];
const stageIcons = ['car', 'route', 'location', 'shield'] as const;
const minimumCardInset = 48;
const maximumCardWidth = 384;
const cardGap = 12;
// React Native Web doesn't implement snapToInterval; use equivalent CSS snapping.
const webScrollStyle = Platform.OS === 'web' ? { scrollSnapType: 'x mandatory' } as ViewStyle : undefined;
const webCardStyle = Platform.OS === 'web' ? { scrollSnapAlign: 'center' } as ViewStyle : undefined;

export function StageCarousel({ modules, loaded, onSelect }: {
  modules: LearnerModule[]; loaded: boolean; onSelect: (stage: ModuleStageId) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [scrollX] = useState(() => new Animated.Value(0));
  const cardWidth = Math.max(1, Math.min(maximumCardWidth, width - minimumCardInset * 2));
  const cardInset = Math.max(0, (width - cardWidth) / 2);
  const step = cardWidth + cardGap;
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);
  // Keep the current card aligned after rotation or resizing.
  useEffect(() => {
    const offset = pageRef.current * step;
    scroll.current?.scrollTo({ x: offset, animated: false });
    scrollX.setValue(offset);
  }, [step, scrollX, width]);

  function selectPage(index: number) {
    setPage(index);
    scroll.current?.scrollTo({ x: index * step, animated: false });
    scrollX.setValue(index * step);
  }

  return <View style={styles.carousel} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 && <Animated.ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
      snapToInterval={step} snapToAlignment="start" decelerationRate="fast" bounces={false}
      style={[styles.scroll, webScrollStyle]} contentContainerStyle={[styles.cards, { paddingHorizontal: cardInset }]} scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: Platform.OS !== 'web',
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.max(0, Math.min(moduleStages.length - 1,
          Math.round(event.nativeEvent.contentOffset.x / step)))),
      })}>
      {moduleStages.map((stage, index) => {
        const summary = getModuleSummary(modules.filter(module => module.stage === stage.id));
        return <Animated.View key={stage.id} style={[webCardStyle, { width: cardWidth,
          opacity: scrollX.interpolate({ inputRange: [(index - 1) * step, index * step, (index + 1) * step],
            outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' }),
        }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Stage ${stage.id}, ${stage.title}, ${loaded ? summary.stars : 'unavailable'} of ${summary.maxStars} stars`}
            accessibilityHint={page === index ? 'Open the modules in this stage' : 'Centre this stage in the carousel'}
            onPress={() => page === index ? onSelect(stage.id) : selectPage(index)}
            style={({ pressed }) => [styles.card, { backgroundColor: stageColors[index] }, pressed && styles.pressed]}>
            <View aria-hidden style={styles.cardContents}>
              <View style={styles.icon}><AppIcon name={stageIcons[index]} size={52} color={colors.ink} strokeWidth={1.6} /></View>
              <View style={styles.heading}>
                <Text style={styles.stageLabel}>STAGE {stage.id}</Text>
                <Text style={styles.title}>{stage.title}</Text>
              </View>
              <View style={styles.progress}>
                <AppIcon name="star" size={21} color={colors.star} fill={colors.starFill} />
                <Text style={styles.progressText}>{loaded ? summary.stars : '—'} / {summary.maxStars} stars</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>;
      })}
    </Animated.ScrollView>}
    <View style={styles.dots}>
      {moduleStages.map((stage, index) => <Pressable key={stage.id} accessibilityRole="button"
        accessibilityLabel={`Show stage ${stage.id}`} aria-selected={page === index}
        onPress={() => selectPage(index)} style={styles.dotTarget}>
        <View style={[styles.dot, page === index && styles.activeDot]} />
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  carousel: { gap: 16 }, scroll: { flexGrow: 0 },
  cards: { gap: cardGap },
  card: { flex: 1, minHeight: 360, borderRadius: 28, padding: 24 },
  cardContents: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  pressed: { opacity: 0.85 }, heading: { alignItems: 'center', gap: 8 },
  stageLabel: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 1.5, color: colors.ink, textAlign: 'center' },
  icon: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: '#FFFFFF99' },
  title: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 36, color: colors.ink, textAlign: 'center' },
  progress: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  progressText: { fontFamily: fonts.medium, fontSize: 19, color: colors.ink, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dotTarget: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neutralBorder },
  activeDot: { width: 24, backgroundColor: colors.accentInk },
});
