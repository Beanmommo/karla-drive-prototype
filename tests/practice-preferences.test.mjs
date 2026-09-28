import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

const values = new Map();
let unavailable = false;
globalThis.__karlaPreferenceStorage = {
  getItem: async key => {
    if (unavailable) throw new Error('Storage unavailable');
    return values.get(key) ?? null;
  },
  setItem: async (key, value) => {
    if (unavailable) throw new Error('Storage unavailable');
    values.set(key, value);
  },
  removeItem: async key => {
    if (unavailable) throw new Error('Storage unavailable');
    values.delete(key);
  },
};
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@react-native-async-storage/async-storage') return {
    url: 'data:text/javascript,export default globalThis.__karlaPreferenceStorage;', shortCircuit: true,
  };
  return next(specifier, context);
} });
const preferences = await import('../src/features/practice/preferences.ts');
const reloadedPreferences = await import('../src/features/practice/preferences.ts?reloaded');
hooks.deregister();
const { readSkipPracticeChecks, saveSkipPracticeChecks } = preferences;

test('remembered pre-check choice survives reloading and stays scoped to the supervisor and learner', async () => {
  values.clear();
  assert.equal(await readSkipPracticeChecks('supervisor-a', 'learner-a'), false);
  await saveSkipPracticeChecks('supervisor-a', 'learner-a', true);
  assert.equal(await reloadedPreferences.readSkipPracticeChecks('supervisor-a', 'learner-a'), true);
  assert.equal(await readSkipPracticeChecks('supervisor-a', 'new-learner'), false);
  assert.equal(await readSkipPracticeChecks('supervisor-b', 'learner-a'), false);
  await saveSkipPracticeChecks('supervisor-a', 'learner-b', true);
  await saveSkipPracticeChecks('supervisor-a', 'learner-b', false);
  assert.equal(await readSkipPracticeChecks('supervisor-a', 'learner-b'), false);
  assert.equal(await readSkipPracticeChecks('supervisor-a', 'learner-a'), true, 'switching learners preserves each choice');
});

test('unreadable or invalid preferences show checks, and failed saves remain retryable', async () => {
  values.clear();
  await saveSkipPracticeChecks('supervisor', 'learner', true);
  const [key] = values.keys();
  values.set(key, 'invalid');
  assert.equal(await readSkipPracticeChecks('supervisor', 'learner'), false);
  unavailable = true;
  try {
    assert.equal(await readSkipPracticeChecks('supervisor', 'learner'), false);
    await assert.rejects(saveSkipPracticeChecks('supervisor', 'learner', true), /Storage unavailable/);
  } finally {
    unavailable = false;
  }
  assert.equal(await readSkipPracticeChecks('supervisor', 'learner'), false);
  await saveSkipPracticeChecks('supervisor', 'learner', true);
  assert.equal(await readSkipPracticeChecks('supervisor', 'learner'), true);
});
