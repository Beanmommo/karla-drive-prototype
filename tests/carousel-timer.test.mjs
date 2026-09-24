import assert from 'node:assert/strict';
import test from 'node:test';

import { createCarouselTimer, TIP_ADVANCE_MS, TIP_RESUME_MS } from '../src/features/practice/carouselTimer.ts';

function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let advances = 0;
  const timer = createCarouselTimer(() => advances++);
  t.after(() => timer.stop());
  timer.start();
  return { timer, advances: () => advances, tick: ms => t.mock.timers.tick(ms) };
}

test('tips advance every ten seconds and return to that cadence after a reading pause', t => {
  const { timer, advances, tick } = setup(t);
  tick(TIP_ADVANCE_MS - 1); assert.equal(advances(), 0);
  tick(1); assert.equal(advances(), 1);
  timer.interact();
  tick(TIP_RESUME_MS - 1); assert.equal(advances(), 1);
  tick(1); assert.equal(advances(), 2);
  tick(TIP_ADVANCE_MS); assert.equal(advances(), 3);
});

test('holding a card pauses indefinitely and releasing allows fifteen seconds to read', t => {
  const { timer, advances, tick } = setup(t);
  tick(9000); timer.touchStart();
  tick(60000); assert.equal(advances(), 0);
  timer.touchEnd();
  tick(TIP_RESUME_MS - 1); assert.equal(advances(), 0);
  tick(1); assert.equal(advances(), 1);
});

test('repeated swipes or button presses restart the inactivity delay without extra timers', t => {
  const { timer, advances, tick } = setup(t);
  timer.interact(); tick(14000); timer.interact(); tick(14000);
  assert.equal(advances(), 0);
  tick(1000); assert.equal(advances(), 1);
  tick(TIP_ADVANCE_MS); assert.equal(advances(), 2);
});

test('a cancelled card press does not release an ongoing swipe', t => {
  const { timer, advances, tick } = setup(t);
  timer.touchStart('card'); timer.touchStart('drag');
  timer.touchEnd('card'); timer.interact();
  tick(60000); assert.equal(advances(), 0);
  timer.touchEnd('drag'); tick(TIP_RESUME_MS);
  assert.equal(advances(), 1);
});

test('leaving the screen cancels pending work and returning starts a fresh interval', t => {
  const { timer, advances, tick } = setup(t);
  tick(9000); timer.stop(); timer.touchEnd(); timer.interact();
  tick(60000); assert.equal(advances(), 0);
  timer.start(); tick(TIP_ADVANCE_MS - 1); assert.equal(advances(), 0);
  tick(1); assert.equal(advances(), 1);
  timer.stop(); tick(60000); assert.equal(advances(), 1);
});
