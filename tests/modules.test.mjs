import assert from 'node:assert/strict';
import test from 'node:test';

import { getLearnerModules, getModuleSummary, getModuleRating, getModuleStage, moduleStages, ratingStatuses } from '../src/features/modules/model.ts';

test('a new learner starts with all 18 modules at zero stars', () => {
  const modules = getLearnerModules('learner-a');
  assert.equal(modules.length, 18);
  assert.equal(new Set(modules.map(module => module.id)).size, 18);
  assert.ok(modules.every(module => module.status === 'not_performed' && module.learnerId === 'learner-a'));
  assert.deepEqual(getModuleSummary(modules), { stars: 0, maxStars: 54, total: 18 });
});

test('star totals include partial ratings and stay isolated by learner', () => {
  const assessed = getLearnerModules('learner-a', {
    turns: 'excellent', roundabouts: 'excellent', intersections: 'needs_practice', parking: 'developing',
  });
  const untouched = getLearnerModules('learner-b');
  assert.deepEqual(getModuleSummary(assessed), { stars: 9, maxStars: 54, total: 18 });
  assert.deepEqual(assessed.map(module => module.id), untouched.map(module => module.id));
  assert.deepEqual(getModuleSummary(untouched), { stars: 0, maxStars: 54, total: 18 });
});

test('saved assessments remain scoped to one account and learner', async () => {
  const { parseAssessments, assessmentStatuses } = await import('../src/features/modules/model.ts');
  const row = { account_id: 'account-a', learner_id: 'learner-a', module_id: 'turns', status: 'excellent', updated_at: '2026-09-23T12:00:00Z' };
  const records = parseAssessments([row], 'account-a', 'learner-a');
  assert.equal(getModuleSummary(getLearnerModules('learner-a', assessmentStatuses(records))).stars, 3);
  assert.throws(() => parseAssessments([row], 'account-b', 'learner-a'));
  assert.throws(() => parseAssessments([row], 'account-a', 'learner-b'));
  for (const change of [{ status: 'completed' }, { module_id: 'missing' }, { updated_at: 'invalid' }]) {
    assert.throws(() => parseAssessments([{ ...row, ...change }], 'account-a', 'learner-a'));
  }
  assert.throws(() => parseAssessments([row, row], 'account-a', 'learner-a'));
  assert.deepEqual(parseAssessments([], 'account-a', 'learner-a'), []);
  const reset = parseAssessments([{ ...row, status: 'not_performed' }], 'account-a', 'learner-a');
  assert.equal(getModuleSummary(getLearnerModules('learner-a', assessmentStatuses(reset))).stars, 0);
});


test('the agreed modules belong to exactly one stage and stage totals add to 54', () => {
  const modules = getLearnerModules('learner-a');
  const expected = [
    ['car_control', 'observation', 'signals', 'hill_starts', 'reversing', 'hazards'],
    ['turns', 'intersections', 'roundabouts', 'speed', 'following', 'parking', 'three_point_turn'],
    ['lane_changes', 'merging', 'conditions'],
    ['independent', 'attention'],
  ];
  assert.deepEqual(moduleStages.map(stage => modules.filter(module => module.stage === stage.id).map(module => module.id)), expected);
  assert.deepEqual(moduleStages.map(stage => getModuleSummary(modules.filter(module => module.stage === stage.id)).maxStars), [18, 21, 9, 6]);
  for (const stage of moduleStages) assert.equal(getModuleStage(String(stage.id)), stage);
  for (const value of [undefined, '0', '5', '1.5', '01', 'bad']) assert.equal(getModuleStage(value), undefined);
});

test('legacy ratings, the intermediate rating, and resetting to zero retain their meaning', () => {
  assert.deepEqual(ratingStatuses.map(getModuleRating), [0, 1, 2, 3]);
  const allThree = Object.fromEntries(getLearnerModules('a').map(module => [module.id, 'excellent']));
  assert.equal(getModuleSummary(getLearnerModules('a', allThree)).stars, 54);
  assert.equal(getModuleSummary(getLearnerModules('a', { ...allThree, reversing: 'developing', attention: 'not_performed' })).stars, 50);
});
