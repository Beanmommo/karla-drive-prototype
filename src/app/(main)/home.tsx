import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { KarlaLogo } from '../../components/KarlaLogo';
import { MainScreen } from '../../components/MainScreen';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LearnerAvatar } from '../../features/learners/LearnerAvatar';
import { useLearners } from '../../features/learners/LearnersProvider';
import { formatBirthDate, getAge } from '../../features/learners/model';
import { colors, fonts } from '../../theme';

export default function HomeScreen() {
  const { learners, loading, offline, error, refresh } = useLearners();
  const addLearner = () => router.push('/learners/new');

  return (
    <MainScreen title="Home">
      {loading && !learners.length ? (
        <View style={styles.welcome}><ActivityIndicator size="large" color={colors.accentInk} /><Text style={styles.description}>Loading your learners…</Text></View>
      ) : error && !learners.length ? (
        <View style={styles.welcome}>
          <AppIcon name="user" size={48} color={colors.accentInk} />
          <Text accessibilityRole="alert" style={styles.description}>{error}</Text>
          <PrimaryButton label="Try again" onPress={() => void refresh()} />
        </View>
      ) : !learners.length ? (
        <View style={styles.welcome}>
          <KarlaLogo size={160} />
          <Text accessibilityRole="header" style={styles.greeting}>A little support.{'\n'}A big journey.</Text>
          <Text style={styles.description}>Add your first learner to start supporting their time behind the wheel.</Text>
          <View style={styles.emptyAction}><PrimaryButton label="Add learner" onPress={addLearner} accessibilityHint="Set up and confirm a learner in three steps" /></View>
        </View>
      ) : (
        <View style={styles.learners}>
          <Text style={styles.intro}>Your learners, all in one place.</Text>
          {(offline || error) && <Text accessibilityRole="alert" style={styles.notice}>Showing saved learners. Connect and try again to refresh.</Text>}
          {(offline || error) && <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}><Text style={styles.link}>Try again</Text></Pressable>}
          <View style={styles.listHeading}><Text accessibilityRole="header" style={styles.listTitle}>Your learners</Text><Text style={styles.count}>{learners.length}</Text></View>
          {learners.map((learner) => (
            <View key={learner.id} style={styles.card}>
              <View style={styles.cardTop}>
                <LearnerAvatar learnerId={learner.id} />
                <View style={styles.identity}><Text style={styles.learnerName}>{learner.name}</Text><Text style={styles.age}>{getAge(learner.date_of_birth)} years old</Text></View>
                <View style={styles.learnerBadge}><Text style={styles.learnerBadgeText}>L</Text></View>
              </View>
              <View style={styles.divider} />
              <View style={styles.detail}><AppIcon name="calendar" size={18} color={colors.muted} /><Text style={styles.detailText}>{formatBirthDate(learner.date_of_birth)}</Text></View>
              <View style={styles.detail}><AppIcon name="location" size={18} color={colors.muted} /><Text style={styles.detailText}>Victoria, Australia</Text></View>
              <View style={styles.confirmation}><AppIcon name="shield" size={16} color={colors.accentInk} /><Text style={styles.confirmationText}>Learner permit confirmed</Text></View>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={addLearner} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <AppIcon name="plus" size={21} color={colors.accentInk} /><Text style={styles.addLabel}>Add another learner</Text>
          </Pressable>
        </View>
      )}
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  welcome: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 20,
  },
  greeting: {
    marginTop: 8,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 28,
    lineHeight: 35,
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  emptyAction: { width: '100%', alignItems: 'center', marginTop: 10 },
  learners: { gap: 16, paddingTop: 10 },
  intro: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.muted, marginBottom: 12 },
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listTitle: { fontFamily: fonts.medium, fontSize: 21, color: colors.ink },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.accentInk, backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  card: { gap: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, borderRadius: 24 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, gap: 3 },
  learnerName: { fontFamily: fonts.medium, fontSize: 22, color: colors.ink },
  age: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  learnerBadge: { backgroundColor: '#FFE391', width: 30, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  learnerBadgeText: { fontFamily: fonts.semibold, fontSize: 22, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 3 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  confirmation: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: colors.accentSoft, padding: 10, borderRadius: 12, marginTop: 3 },
  confirmationText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.accentInk },
  addButton: { minHeight: 62, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accentEdge, borderRadius: 20, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', padding: 14, marginTop: 4 },
  addLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.accentInk },
  pressed: { backgroundColor: colors.accentSoft },
  notice: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.muted },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { fontFamily: fonts.medium, fontSize: 16, color: colors.accentInk },
});
