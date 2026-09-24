import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { ModuleCoachingTips } from '../modules/ModuleCoachingTips';
import type { LearnerModule } from '../modules/model';
import { createCarouselTimer } from './carouselTimer';

export function ModuleTipsCarousel({ modules }: { modules: LearnerModule[] }) {
  const scroll = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof createCarouselTimer> | null>(null);
  const scrollEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const programmatic = useRef(false);
  const currentPage = useRef(0);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const count = modules.length;

  useEffect(() => {
    let mounted = true;
    // React Native Web returns a constant true here, not a detected preference.
    if (Platform.OS !== 'web') {
      void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (mounted) setScreenReader(value); }).catch(() => {});
    }
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const reader = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => { mounted = false; reader?.remove(); motion?.remove(); app?.remove(); clearTimeout(scrollEnd.current); };
  }, []);

  const goTo = useCallback((index: number, animated = true) => {
    if (!width || !count) return;
    const next = (index + count) % count;
    programmatic.current = true;
    currentPage.current = next;
    setPage(next);
    // Wrap directly rather than sweeping backwards through every previous card.
    scroll.current?.scrollTo({ x: next * width, animated: animated && !reduceMotion && index >= 0 && index < count });
    // Web doesn't emit native momentum callbacks. Release the animation marker
    // after scrolling settles so later mouse/trackpad scrolling pauses autoplay.
    clearTimeout(scrollEnd.current);
    scrollEnd.current = setTimeout(() => { programmatic.current = false; }, 500);
  }, [width, count, reduceMotion]);

  useEffect(() => { goTo(currentPage.current, false); }, [goTo]);

  useFocusEffect(useCallback(() => {
    if (!width || count < 2 || !appActive || screenReader || reduceMotion) return;
    const autoplay = createCarouselTimer(() => goTo(currentPage.current + 1));
    timer.current = autoplay;
    autoplay.start();
    return () => { autoplay.stop(); timer.current = null; };
  }, [width, count, appActive, screenReader, reduceMotion, goTo]));

  function touchStart(source = 'touch') {
    programmatic.current = false;
    timer.current?.touchStart(source);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    const next = Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
    currentPage.current = next;
    setPage(next);
    if (!programmatic.current) timer.current?.interact();
    clearTimeout(scrollEnd.current);
    scrollEnd.current = setTimeout(() => { programmatic.current = false; }, 150);
  }

  function navigate(direction: number) {
    timer.current?.interact();
    goTo(currentPage.current + direction);
  }

  return <View style={styles.panel}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.heading}>Supervisor tips</Text>
      <Text accessibilityLabel={`Tip ${page + 1} of ${count}`} style={styles.counter}>{page + 1}/{count}</Text>
      {count > 1 && <>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous supervisor tip"
          onPressIn={() => timer.current?.touchStart()} onPressOut={() => timer.current?.touchEnd()}
          onPress={() => navigate(-1)} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <AppIcon name="back" size={19} color={colors.accentInk} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next supervisor tip"
          onPressIn={() => timer.current?.touchStart()} onPressOut={() => timer.current?.touchEnd()}
          onPress={() => navigate(1)} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <AppIcon name="chevronRight" size={21} color={colors.accentInk} />
        </Pressable>
      </>}
    </View>
    <View style={styles.viewport} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        style={styles.scroll} contentContainerStyle={styles.pages} bounces={false} scrollEventThrottle={32}
        onTouchStart={() => touchStart()} onTouchEnd={() => timer.current?.touchEnd()} onTouchCancel={() => timer.current?.touchEnd()}
        onScrollBeginDrag={() => touchStart('drag')} onScrollEndDrag={() => timer.current?.touchEnd('drag')}
        onScroll={onScroll}>
        {modules.map((module, index) => <Pressable key={module.id} accessible={false}
          aria-hidden={index !== page} accessibilityElementsHidden={index !== page} importantForAccessibility={index === page ? 'auto' : 'no-hide-descendants'}
          onPressIn={() => touchStart('card')} onPressOut={() => timer.current?.touchEnd('card')}
          style={[styles.card, { width }]}>
          <ModuleCoachingTips module={module} />
        </Pressable>)}
      </ScrollView>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 0, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 2 },
  heading: { flex: 1, fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  counter: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginRight: 4 },
  arrow: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  pressed: { backgroundColor: colors.accentSoft },
  viewport: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 20, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  pages: { height: '100%', alignItems: 'stretch' },
  card: { height: '100%', padding: 16, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border },
});
