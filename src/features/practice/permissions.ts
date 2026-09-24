import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking, Platform } from 'react-native';

export type AccessResult = 'granted' | 'denied' | 'settings';
const locationReady = (p: Location.LocationPermissionResponse) => p.granted
  && (Platform.OS !== 'ios' || p.ios?.accuracy === 'full');
// SDK 57's background requester returns PermissionResponse (no nested ios object).
// On iOS it grants only CLAuthorizationStatusAuthorizedAlways.
const backgroundReady = (p: Location.PermissionResponse) => p.granted;
const notificationsReady = (p: Notifications.NotificationPermissionsStatus) => p.granted
  && (Platform.OS !== 'ios' || (p.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED && p.ios.allowsAlert !== false));
export async function hasPracticeAccess(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const [foreground, background, notifications, services, tasks] = await Promise.all([
    Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(), Location.hasServicesEnabledAsync(), TaskManager.isAvailableAsync(),
  ]);
  return locationReady(foreground) && backgroundReady(background) && notificationsReady(notifications) && services && tasks;
}
async function settings(title: string, message: string): Promise<AccessResult> {
  const open = await new Promise<boolean>(resolve => Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Open Settings', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
  if (!open) return 'denied';
  await Linking.openSettings();
  return 'settings';
}
export async function requestPracticeAccess(): Promise<AccessResult> {
  if (Platform.OS !== 'ios') {
    Alert.alert('Practice on iPhone', 'Use the Karla Drive iPhone app to record in the background and navigate with Apple Maps. You can review history here.');
    return 'denied';
  }
  if (!await TaskManager.isAvailableAsync()) {
    Alert.alert('Development build required', 'Install the current Karla Drive development build to enable background practice recording.');
    return 'denied';
  }
  if (!await Location.hasServicesEnabledAsync()) return settings('Enable location services', 'Location services must be on before starting practice.');
  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted && foreground.canAskAgain) foreground = await Location.requestForegroundPermissionsAsync();
  if (!locationReady(foreground)) return settings('GPS access required', 'Allow location and turn on Precise Location for Karla Drive before continuing.');
  let background = await Location.getBackgroundPermissionsAsync();
  if (!backgroundReady(background) && background.canAskAgain) {
    const proceed = await new Promise<boolean>(resolve => Alert.alert('Record while using Maps',
      'Allow location Always so Karla Drive can keep recording while Apple Maps is open or your phone is locked.', [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ]));
    if (!proceed) return 'denied';
    background = await Location.requestBackgroundPermissionsAsync();
  }
  if (!backgroundReady(background)) return settings('Background tracking required', 'Set Karla Drive location access to Always. Allow Once or While Using the App is not enough for this practice flow.');
  let notifications = await Notifications.getPermissionsAsync();
  if (!notificationsReady(notifications) && notifications.canAskAgain) {
    notifications = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  }
  if (!notificationsReady(notifications)) return settings('Notifications required', 'Enable notifications and alerts for Karla Drive to receive session and detected-activity updates.');
  return 'granted';
}
