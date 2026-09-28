import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { colors, fonts } from '../../theme';
import { getModuleRating, moduleStatusLabels, ratingDescriptions, ratingStatuses, type ModuleStatus } from './model';

export function ModuleStars({ status, size = 19 }: { status: ModuleStatus; size?: number }) {
  const rating = getModuleRating(status);
  return <View accessible accessibilityLabel={`${rating} of 3 stars`} style={styles.stars}>
    {[1, 2, 3].map(star => <AppIcon key={star} name="star" size={size}
      color={star <= rating ? colors.star : colors.muted} fill={star <= rating ? colors.starFill : 'none'} />)}
    <Text style={styles.count}>{rating}/3</Text>
  </View>;
}

export function ModuleRatingInput({ status, onChange, disabled = false, label = 'Module rating' }: {
  status: ModuleStatus; onChange: (status: ModuleStatus) => void; disabled?: boolean; label?: string;
}) {
  const rating = getModuleRating(status);
  return <View style={styles.input}>
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.options}>
      {ratingStatuses.map((value, index) => <Pressable key={value} accessibilityRole="radio"
        accessibilityLabel={`${moduleStatusLabels[value]}, ${ratingDescriptions[getModuleRating(value)]}`}
        aria-checked={value === status} aria-disabled={disabled} disabled={disabled}
        onPress={() => onChange(value)} style={({ pressed }) => [styles.option,
          value === status && styles.selected, pressed && styles.pressed, disabled && styles.disabled]}>
        {index === 0 ? <Text style={styles.zero}>0</Text> : <AppIcon name="star" size={32}
          color={index <= rating ? colors.star : colors.muted} fill={index <= rating ? colors.starFill : 'none'} />}
      </Pressable>)}
    </View>
    <Text aria-live="polite" style={styles.description}>{moduleStatusLabels[status]} · {ratingDescriptions[rating]}</Text>
  </View>;
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { marginLeft: 4, color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  input: { gap: 12 },
  options: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: { minWidth: 48, minHeight: 52, flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.star, backgroundColor: colors.starSoft },
  pressed: { backgroundColor: colors.starSoft },
  disabled: { opacity: 0.6 },
  zero: { fontFamily: fonts.medium, fontSize: 22, color: colors.muted },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted },
});
