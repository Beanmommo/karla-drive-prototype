import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
const granted = { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
let state;
const reset = () => { state = { foreground: { ...granted, ios: { scope: 'always', accuracy: 'full' } },
  // SDK 57 returns background scope at the top level, not in ios.
  background: { ...granted, scope: 'always' }, notifications: { ...granted, ios: { status: 2, allowsAlert: true } },
  services: true, tasks: true, asked: [], alerts: [] }; };
const modules = {
  'expo-location': { getForegroundPermissionsAsync: async () => state.foreground, getBackgroundPermissionsAsync: async () => state.background,
    hasServicesEnabledAsync: async () => state.services,
    requestForegroundPermissionsAsync: async () => { state.asked.push('foreground'); return state.foreground; },
    requestBackgroundPermissionsAsync: async () => { state.asked.push('background'); return state.background; } },
  'expo-notifications': { IosAuthorizationStatus: { AUTHORIZED: 2 }, getPermissionsAsync: async () => state.notifications,
    requestPermissionsAsync: async () => { state.asked.push('notifications'); return state.notifications; } },
  'expo-task-manager': { isAvailableAsync: async () => state.tasks },
  'react-native': { Platform: { OS: 'ios' }, Linking: { openSettings: async () => {} },
    Alert: { alert: (title, _body, buttons) => { state.alerts.push(title); buttons?.[0].onPress?.(); } } },
};
globalThis.__karlaPermissions = modules;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (modules[specifier]) {
    const source = Object.keys(modules[specifier]).map(key => `export const ${key}=globalThis.__karlaPermissions[${JSON.stringify(specifier)}][${JSON.stringify(key)}];`).join('\n');
    return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
  }
  return next(specifier, context);
} });
const { hasPracticeAccess, requestPracticeAccess } = await import('../src/features/practice/permissions.ts');
hooks.deregister();
test('SDK 57 Always permission skips prompts when all access is granted', async () => {
  reset(); assert.equal(await hasPracticeAccess(), true); assert.equal(await requestPracticeAccess(), 'granted');
  assert.deepEqual(state.asked, []); assert.deepEqual(state.alerts, []);
});
test('location denial, reduced accuracy, background denial, or notification denial each block entry', async () => {
  for (const missing of ['foreground', 'background', 'notifications']) {
    reset(); state[missing] = { ...state[missing], granted: false, canAskAgain: false };
    assert.equal(await hasPracticeAccess(), false);
    assert.equal(await requestPracticeAccess(), 'denied');
  }
  reset(); state.foreground.ios.accuracy = 'reduced';
  assert.equal(await requestPracticeAccess(), 'denied');
});
test('disabled location services and unavailable native background tasks block entry', async () => {
  reset(); state.services = false; assert.equal(await hasPracticeAccess(), false);
  assert.equal(await requestPracticeAccess(), 'denied');
  reset(); state.tasks = false; assert.equal(await requestPracticeAccess(), 'denied');
  assert.deepEqual(state.asked, []);
});
