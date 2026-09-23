import assert from 'node:assert/strict';
import test from 'node:test';

import { dateToISO, getAge, parseBirthDate, validateLearner } from '../src/features/learners/model.ts';

const today = new Date(2026, 8, 23, 12);
const valid = () => ({
  name: 'Alex', dateOfBirth: '2008-04-16', country: 'AU', state: 'VIC', termsAccepted: true,
  acknowledgements: { permit: true },
});

test('requires a supported country and state', () => {
  assert.match(validateLearner({ ...valid(), country: '' }, today), /Australia and Victoria/);
  assert.match(validateLearner({ ...valid(), state: 'NSW' }, today), /Australia and Victoria/);
});

test('rejects whitespace names and excessive length, accepts international names', () => {
  assert.match(validateLearner({ ...valid(), name: '   ' }, today), /name/);
  assert.match(validateLearner({ ...valid(), name: 'a'.repeat(101) }, today), /100/);
  assert.equal(validateLearner({ ...valid(), name: '  Zoë 李  ' }, today), null);
});

test('validates real calendar dates, including leap years', () => {
  assert.equal(parseBirthDate('2009-02-29'), null);
  assert.equal(parseBirthDate('2008-02-30'), null);
  assert.equal(parseBirthDate('2008-13-01'), null);
  assert.equal(parseBirthDate('16/04/2008'), null);
  assert.equal(dateToISO(parseBirthDate('2008-02-29')), '2008-02-29');
});

test('keeps the calendar date stable without converting it to UTC', () => {
  assert.equal(dateToISO(new Date(2008, 3, 16, 0, 1)), '2008-04-16');
  assert.equal(dateToISO(new Date(2008, 3, 16, 23, 59)), '2008-04-16');
});

test('requires a date and rejects future dates', () => {
  assert.match(validateLearner({ ...valid(), dateOfBirth: '' }, today), /valid date/);
  assert.match(validateLearner({ ...valid(), dateOfBirth: '2027-01-01' }, today), /future/);
});

test('accepts the sixteenth birthday, rejects the day before', () => {
  assert.equal(validateLearner({ ...valid(), dateOfBirth: '2010-09-23' }, today), null);
  assert.match(validateLearner({ ...valid(), dateOfBirth: '2010-09-24' }, today), /at least 16/);
  assert.equal(getAge('2008-09-24', today), 17);
});

test('requires permit confirmation without requiring per-drive checks', () => {
  assert.equal(validateLearner(valid(), today), null);
  assert.match(validateLearner({ ...valid(), acknowledgements: { permit: false } }, today), /valid learner permit/);
  assert.match(validateLearner({ ...valid(), acknowledgements: {} }, today), /valid learner permit/);
});

test('requires explicit agreement and accepts a complete learner', () => {
  assert.match(validateLearner({ ...valid(), termsAccepted: false }, today), /demo terms/);
  assert.equal(validateLearner(valid(), today), null);
});
