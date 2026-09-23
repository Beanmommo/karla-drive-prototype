import { StyleSheet, Text } from 'react-native';

import { FormSheet } from '../../components/FormSheet';
import { colors, fonts } from '../../theme';

export function DemoAgreement({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <FormSheet visible={visible} onClose={onClose} title="Demo terms & agreement">
      <Text style={styles.text}>Karla Drive is a demonstration for supervisors managing learner profiles. These demo terms apply to this prototype.</Text>
      <Text style={styles.text}>Only add a learner whose details you have permission to record. Use sample details when trying the demo.</Text>
      <Text style={styles.text}>Learner names, dates of birth, locations and your confirmations are saved for the demo. Demo records may be reset and are not an official driving logbook.</Text>
      <Text style={styles.text}>You are responsible for checking the learner’s permit, your eligibility to supervise and the current Victorian road rules before every drive. Creating a profile does not verify eligibility or authorise driving.</Text>
      <Text style={styles.version}>Demo agreement · version 1</Text>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25, color: colors.ink },
  version: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
