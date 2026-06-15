// Unit tests for lib/gesture-detector.js (pure gesture state machine).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GestureDetector, GestureEvent } from '../lib/gesture-detector.js';

// Neutral 0 so both directions have room (a real device uses ~90, where only
// the "down" side has range — see the config notes).
function makeConfig(overrides = {}) {
  return {
    neutralGamma: 0,
    triggerAngle: 35,
    neutralBand: 15,
    cooldownMs: 800,
    invertDirection: false,
    positionMaxDeviation: 60,
    positionDebounceMs: 1500,
    ...overrides,
  };
}

function record(config) {
  const events = [];
  const detector = new GestureDetector(config, (e) => events.push(e.type));
  return { detector, events };
}

test('fires HIT when gamma drops past the trigger (tilt down)', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0); // settle at neutral -> armed
  detector.process(-40, 100); // past -35 -> hit
  assert.deepEqual(events, [GestureEvent.ARMED, GestureEvent.HIT]);
});

test('fires SKIP when gamma rises past the trigger (tilt up)', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0);
  detector.process(40, 100);
  assert.deepEqual(events, [GestureEvent.ARMED, GestureEvent.SKIP]);
});

test('does not fire twice while staying tilted (needs to re-arm)', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0);
  detector.process(-40, 100); // hit
  detector.process(-50, 200); // still tilted -> nothing
  detector.process(-45, 300);
  assert.deepEqual(events, [GestureEvent.ARMED, GestureEvent.HIT]);
});

test('re-arms after returning to neutral, then can fire again', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0); // armed
  detector.process(-40, 100); // hit (cooldown until 900)
  detector.process(0, 1000); // back to neutral, past cooldown -> armed
  detector.process(-40, 1100); // hit again
  assert.deepEqual(events, [
    GestureEvent.ARMED,
    GestureEvent.HIT,
    GestureEvent.ARMED,
    GestureEvent.HIT,
  ]);
});

test('an overshoot to the opposite side during cooldown is NOT counted', () => {
  // The exact risk: tilt down (hit), then on the way back overshoot up.
  const { detector, events } = record(makeConfig());
  detector.process(0, 0); // armed
  detector.process(-40, 100); // HIT, cooldown until 900
  detector.process(0, 300); // passes neutral but still in cooldown -> not armed
  detector.process(45, 500); // overshoot up -> must NOT fire skip
  assert.deepEqual(events, [GestureEvent.ARMED, GestureEvent.HIT]);
});

test('invertDirection swaps hit and skip', () => {
  const { detector, events } = record(makeConfig({ invertDirection: true }));
  detector.process(0, 0);
  detector.process(-40, 100); // gamma down, inverted -> skip
  assert.deepEqual(events, [GestureEvent.ARMED, GestureEvent.SKIP]);
});

test('a value between neutralBand and triggerAngle does nothing', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0); // armed
  detector.process(25, 100); // dead zone (15..35)
  assert.deepEqual(events, [GestureEvent.ARMED]);
});

test('sustained large deviation past the debounce asks to reposition', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0); // armed
  detector.process(80, 100); // far off (>60), debounce starts
  detector.process(80, 1700); // sustained >= 1500ms -> reposition
  assert.deepEqual(events, [GestureEvent.ARMED, GestureEvent.REPOSITION]);
  assert.equal(detector.outOfPosition, true);
});

test('a brief excursion (a gesture) does not trip the reposition warning', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0);
  detector.process(80, 100); // off, but...
  detector.process(0, 400); // ...back within 300ms (< debounce)
  assert.ok(!events.includes(GestureEvent.REPOSITION));
  assert.equal(detector.outOfPosition, false);
});

test('emits POSITIONED when returning after a reposition', () => {
  const { detector, events } = record(makeConfig());
  detector.process(80, 0);
  detector.process(80, 2000); // reposition
  detector.process(0, 2100); // back in position
  assert.ok(events.includes(GestureEvent.REPOSITION));
  assert.ok(events.includes(GestureEvent.POSITIONED));
});

test('no detection while out of position', () => {
  const { detector, events } = record(makeConfig());
  detector.process(80, 0);
  detector.process(80, 2000); // reposition
  detector.process(-40, 2100); // would be a hit, but still out of position frame
  // -40 is within maxDeviation so it clears position first, then re-arms;
  // it should NOT count as a hit on the same sample it returns.
  const firstHitIndex = events.indexOf(GestureEvent.HIT);
  assert.equal(firstHitIndex, -1);
});

test('reset clears state', () => {
  const { detector, events } = record(makeConfig());
  detector.process(0, 0);
  detector.process(-40, 100); // hit, cooldown set
  detector.reset();
  assert.equal(detector.armed, false);
  assert.equal(detector.outOfPosition, false);
  events.length = 0;
  detector.process(-40, 150); // not armed yet (must settle at neutral first)
  assert.deepEqual(events, []);
});
