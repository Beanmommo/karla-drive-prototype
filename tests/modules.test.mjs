import assert from 'node:assert/strict';
import test from 'node:test';

import { getLearnerModules, getModuleSummary } from '../src/features/modules/model.ts';

test('a new learner starts with all 16 modules not performed and no completed modules', () => {
  const modules = getLearnerModules('learner-a');
  assert.equal(modules.length, 16);
  assert.equal(new Set(modules.map(module => module.id)).size, 16);
  assert.ok(modules.every(module => module.status === 'not_performed' && module.learnerId === 'learner-a'));
  assert.deepEqual(getModuleSummary(modules), { excellent: 0, total: 16 });
});

test('the summary counts only Excellent without reordering or sharing learner status', () => {
  const assessed = getLearnerModules('learner-a', {
    turns: 'excellent', roundabouts: 'excellent', intersections: 'needs_practice', parking: 'not_performed',
  });
  const untouched = getLearnerModules('learner-b');
  assert.deepEqual(getModuleSummary(assessed), { excellent: 2, total: 16 });
  assert.deepEqual(assessed.map(module => module.id), untouched.map(module => module.id));
  assert.deepEqual(getModuleSummary(untouched), { excellent: 0, total: 16 });
});

test('saved assessments remain scoped to one account and learner', async () => {
  const { parseAssessments, assessmentStatuses } = await import('../src/features/modules/model.ts');
  const row = { account_id: 'account-a', learner_id: 'learner-a', module_id: 'turns', status: 'excellent', updated_at: '2026-09-23T12:00:00Z' };
  const records = parseAssessments([row], 'account-a', 'learner-a');
  assert.equal(getModuleSummary(getLearnerModules('learner-a', assessmentStatuses(records))).excellent, 1);
  assert.throws(() => parseAssessments([row], 'account-b', 'learner-a'));
  assert.throws(() => parseAssessments([row], 'account-a', 'learner-b'));
  for (const change of [{ status: 'completed' }, { module_id: 'missing' }, { updated_at: 'invalid' }]) {
    assert.throws(() => parseAssessments([{ ...row, ...change }], 'account-a', 'learner-a'));
  }
  assert.throws(() => parseAssessments([row, row], 'account-a', 'learner-a'));
  assert.deepEqual(parseAssessments([], 'account-a', 'learner-a'), []);
  const reset = parseAssessments([{ ...row, status: 'not_performed' }], 'account-a', 'learner-a');
  assert.equal(getModuleSummary(getLearnerModules('learner-a', assessmentStatuses(reset))).excellent, 0);
});
