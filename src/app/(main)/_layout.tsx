import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/Avatar';
import { AppIcon } from '../../components/AppIcon';
import { TabIcon } from '../../components/TabIcon';
import { colors, fonts } from '../../theme';

export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'bottom',
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: colors.muted,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <View style={styles.barBackground} />,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          // The top 24px stay inside the touch area so the raised circle is fully tappable.
          height: 84 + insets.bottom,
          paddingTop: 0,
          paddingBottom: 4 + insets.bottom,
          elevation: 0,
        },
        tabBarItemStyle: { paddingTop: 26 },
        tabBarIconStyle: { width: 48, height: 30 },
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused}>
              <AppIcon name="home" size={22} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarAccessibilityLabel: 'Practice',
          tabBarItemStyle: { paddingTop: 0 },
          tabBarIconStyle: { width: 56, height: 56 },
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.label, focused && styles.practiceLabel]}>Practice</Text>
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} prominent>
              <AppIcon name="play" size={26} color={colors.accentInk} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarAccessibilityLabel: 'Account',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Avatar size={26} tone="neutral" />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 14,
    marginTop: 0,
    color: colors.muted,
  },
  practiceLabel: {
    color: colors.accentInk,
  },
  barBackground: {
    position: 'absolute',
    top: 24,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});
