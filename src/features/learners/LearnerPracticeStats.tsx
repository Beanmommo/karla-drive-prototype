import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { getAge, type Learner } from './model';
import {
  formatPracticeHours,
  getPracticeHourTargets,
  PRACTICE_REQUIREMENTS_URL,
} from './practiceStats';
import { usePracticeTotals } from '../practice/PracticeSummary';

const ARC = 'M 10 90 A 80 80 0 0 1 170 90';
const ARC_LENGTH = Math.PI * 80;

function HoursStat({ label, minutes, target, night = false }: {
  label: string;
  minutes: number;
  target?: number;
  night?: boolean;
}) {
  const hours = formatPracticeHours(minutes);
  const progress = target ? Math.min(minutes / (target * 60), 1) : 0;
  const description = target ? `${hours} of ${target} hours required` : `${hours} hours`;

  return (
    <View
      accessible
      accessibilityRole={target ? 'progressbar' : 'text'}
      accessibilityLabel={`${label}, ${description}`}
      aria-valuemin={target ? 0 : undefined}
      aria-valuemax={target}
      aria-valuenow={target ? Math.min(minutes / 60, target) : undefined}
      aria-valuetext={target ? description : undefined}
      style={styles.stat}
    >
      <View aria-hidden style={styles.statContents}>
        <View style={[styles.icon, night && styles.nightIcon]}>
          <AppIcon name={night ? 'moon' : 'clock'} size={20} color={night ? '#675294' : colors.accentInk} />
        </View>
        <Text style={styles.label}>{label}</Text>
        {target ? (
          <View style={styles.gauge}>
            <Svg width="100%" height="100%" viewBox="0 0 180 100" style={StyleSheet.absoluteFill}>
              <Path d={ARC} fill="none" stroke={night ? '#EEE8F8' : colors.accentSoft} strokeWidth={12} strokeLinecap="round" />
              {progress > 0 && (
                <Path
                  d={ARC}
                  fill="none"
                  stroke={night ? '#A78CD5' : colors.accentEdge}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
                  strokeDashoffset={ARC_LENGTH * (1 - progress)}
                />
              )}
            </Svg>
            <Text maxFontSizeMultiplier={1.3} adjustsFontSizeToFit numberOfLines={1} style={styles.gaugeNumber}>{hours}</Text>
          </View>
        ) : (
          <Text style={styles.number}>{hours}</Text>
        )}
        <Text style={styles.unit}>{target ? `of ${target} hours` : 'hours'}</Text>
      </View>
    </View>
  );
}

export function LearnerPracticeStats({ learner }: { learner: Learner }) {
  const stats = usePracticeTotals(learner);
  const [today, setToday] = useState(() => new Date());
  const { width, fontScale } = useWindowDimensions();
  const targets = getPracticeHourTargets(getAge(learner.date_of_birth, today));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function updateDate() {
      const now = new Date();
      setToday(now);
      scheduleMidnight(now);
    }
    function scheduleMidnight(now: Date) {
      clearTimeout(timer);
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(updateDate, midnight.getTime() - now.getTime());
    }
    scheduleMidnight(new Date());
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateDate();
    });
    return () => { clearTimeout(timer); listener.remove(); };
  }, []);

  return (
    <View style={styles.section}>
      <View style={[styles.stats, (width < 360 || fontScale > 1.3) && styles.stacked]}>
        <HoursStat label="Total hours" minutes={stats.totalMinutes} target={targets?.total} />
        <HoursStat label="Night hours" minutes={stats.nightMinutes} target={targets?.night} night />
      </View>
      {targets && (
        <Link href={PRACTICE_REQUIREMENTS_URL} target="_blank" style={styles.requirements}>
          VicRoads requirements · Under 21
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  stats: { flexDirection: 'row', gap: 12 },
  stacked: { flexDirection: 'column' },
  stat: { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 20 },
  statContents: { alignItems: 'center', gap: 8 },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft },
  nightIcon: { backgroundColor: '#EEE8F8' },
  label: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink, textAlign: 'center', marginBottom: 10 },
  gauge: { width: '100%', maxWidth: 200, aspectRatio: 1.8, justifyContent: 'flex-end', alignItems: 'center' },
  gaugeNumber: { fontFamily: fonts.medium, fontSize: 38, color: colors.ink, textAlign: 'center', width: '65%' },
  number: { fontFamily: fonts.medium, fontSize: 42, color: colors.ink, textAlign: 'center' },
  unit: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center' },
  requirements: { fontFamily: fonts.regular, fontSize: 14, color: colors.accentInk, textAlign: 'center', textDecorationLine: 'underline', paddingVertical: 12 },
});
