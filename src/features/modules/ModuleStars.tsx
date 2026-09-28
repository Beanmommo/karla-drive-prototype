import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { getModuleRating, moduleStatusLabels, ratingDescriptions, ratingStatuses, type ModuleStatus } from './model';

export function ModuleStars({ status, size = 19, showCount = true }: { status: ModuleStatus; size?: number; showCount?: boolean }) {
  const rating = getModuleRating(status);
  return <View accessible accessibilityLabel={`${rating} of 3 stars`} style={styles.stars}>
    {[1, 2, 3].map(star => <AppIcon key={star} name="star" size={size}
      color={star <= rating ? colors.star : colors.muted} fill={star <= rating ? colors.starFill : 'none'} />)}
    {showCount && <Text style={styles.count}>{rating}/3</Text>}
  </View>;
}

export function ModuleRatingInput({ status, onChange, disabled = false, label = 'Module rating' }: {
  status: ModuleStatus; onChange: (status: ModuleStatus) => void; disabled?: boolean; label?: string;
}) {
  const rating = getModuleRating(status);
  return <View accessibilityLabel={label} style={styles.options}>
    {ratingStatuses.slice(1).map(value => {
      const star = getModuleRating(value);
      const selected = value === status;
      return <Pressable key={value} accessibilityRole="button"
        accessibilityLabel={`${label}: ${moduleStatusLabels[value]}, ${ratingDescriptions[star]}`}
        accessibilityHint={selected ? 'Clear the rating to zero stars' : `Set the rating to ${moduleStatusLabels[value]}`}
        accessibilityState={{ selected, disabled }} disabled={disabled}
        onPress={() => onChange(selected ? 'not_performed' : value)}
        style={({ pressed }) => [styles.option, pressed && styles.pressed, disabled && styles.disabled]}>
        <AppIcon name="star" size={48}
          color={star <= rating ? colors.star : colors.muted} fill={star <= rating ? colors.starFill : 'none'} />
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { marginLeft: 4, color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  options: { flexDirection: 'row', gap: 8 },
  option: { minWidth: 64, minHeight: 72, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  pressed: { backgroundColor: colors.starSoft },
  disabled: { opacity: 0.6 },
});
