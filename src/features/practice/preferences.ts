import AsyncStorage from '@react-native-async-storage/async-storage';

const checksKey = (accountId: string, learnerId: string) =>
  `karla:skip-practice-checks:v1:${accountId}:${learnerId}`;

export async function readSkipPracticeChecks(accountId: string, learnerId: string): Promise<boolean> {
  // Missing or unreadable preferences always show the checklist.
  return await AsyncStorage.getItem(checksKey(accountId, learnerId)).catch(() => null) === 'true';
}

export async function saveSkipPracticeChecks(accountId: string, learnerId: string, skip: boolean): Promise<void> {
  if (skip) await AsyncStorage.setItem(checksKey(accountId, learnerId), 'true');
  else await AsyncStorage.removeItem(checksKey(accountId, learnerId));
}
