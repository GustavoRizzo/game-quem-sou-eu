// Unit tests for lib/forehead-tilt.js (gamma unwrap around the ±90 fold).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { foreheadTilt } from '../lib/forehead-tilt.js';

test('both +90 and -90 map to the same neutral center (90)', () => {
  assert.equal(foreheadTilt(90), 90);
  assert.equal(foreheadTilt(-90), 90);
});

test('the "down/hit" side keeps gamma as-is (below neutral)', () => {
  assert.equal(foreheadTilt(50), 50); // a hit excursion
  assert.equal(foreheadTilt(30), 30);
});

test('the "up/skip" side unfolds the negative gamma above neutral', () => {
  assert.equal(foreheadTilt(-60), 120); // a skip excursion
  assert.equal(foreheadTilt(-30), 150);
});

test('is continuous across the fold (89 -> 90 -> 91)', () => {
  assert.equal(foreheadTilt(89), 89);
  assert.equal(foreheadTilt(90), 90);
  assert.equal(foreheadTilt(-89), 91);
});

test('increases monotonically across the operating region', () => {
  const samples = [40, 60, 80, 90, -80, -60, -40]; // hit -> neutral -> skip
  const tilts = samples.map(foreheadTilt);
  for (let i = 1; i < tilts.length; i++) {
    assert.ok(tilts[i] > tilts[i - 1], `expected ${tilts[i]} > ${tilts[i - 1]}`);
  }
});
