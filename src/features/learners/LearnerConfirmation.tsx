import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/AppIcon';
import { RequirementCheckbox } from '../../components/RequirementCheckbox';
import { colors, fonts } from '../../theme';
import { formatBirthDate, learnerRequirements, type LearnerDraft } from './model';

export function LearnerConfirmation({ draft, onEditLocation, onEditDetails, disabled }: {
  draft: LearnerDraft;
  onEditLocation: () => void;
  onEditDetails: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.summary}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppIcon name="location" size={21} color={colors.accentInk} />
          <Text accessibilityRole="header" style={styles.heading}>Location</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit location" disabled={disabled} onPress={onEditLocation} style={styles.editButton}>
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.detail}><Text style={styles.label}>Country</Text><Text style={styles.value}>Australia</Text></View>
          <View style={styles.detail}><Text style={styles.label}>State</Text><Text style={styles.value}>Victoria</Text></View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppIcon name="user" size={21} color={colors.accentInk} />
          <Text accessibilityRole="header" style={styles.heading}>Learner details</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit learner details" disabled={disabled} onPress={onEditDetails} style={styles.editButton}>
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.detail}><Text style={styles.label}>Name</Text><Text style={styles.value}>{draft.name.trim()}</Text></View>
        <View style={styles.divider} />
        <View style={styles.detail}><Text style={styles.label}>Date of birth</Text><Text style={styles.value}>{formatBirthDate(draft.dateOfBirth)}</Text></View>
      </View>

      <View style={styles.confirmations}>
        <Text accessibilityRole="header" style={styles.heading}>Confirmations</Text>
        {learnerRequirements.filter(({ id }) => draft.acknowledgements[id]).map(({ id, title }) => (
          <RequirementCheckbox key={id} title={title} checked disabled onChange={() => {}} />
        ))}
        {draft.termsAccepted && <RequirementCheckbox title="Demo terms & agreement accepted" checked disabled onChange={() => {}} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 18 },
  card: { padding: 20, gap: 18, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -8, marginBottom: -4 },
  heading: { flex: 1, fontFamily: fonts.medium, fontSize: 18, lineHeight: 25, color: colors.ink },
  editButton: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  editLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.accentInk },
  locationRow: { flexDirection: 'row', gap: 18 },
  detail: { flex: 1, gap: 5 },
  label: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  value: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 27, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
  confirmations: { gap: 12, paddingTop: 6 },
});
