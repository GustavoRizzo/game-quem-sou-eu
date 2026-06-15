// Unit tests for lib/gauge-geometry.js (pure gauge math).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { valueToPercent, bandToPercent } from '../lib/gauge-geometry.js';

test('maps the ends and the middle of the range', () => {
  assert.equal(valueToPercent(0, 0, 100), 0);
  assert.equal(valueToPercent(100, 0, 100), 100);
  assert.equal(valueToPercent(50, 0, 100), 50);
});

test('clamps values outside the range', () => {
  assert.equal(valueToPercent(-20, 0, 100), 0);
  assert.equal(valueToPercent(150, 0, 100), 100);
});

test('works for the forehead tilt range (0..180)', () => {
  assert.equal(valueToPercent(90, 0, 180), 50);
  assert.equal(valueToPercent(45, 0, 180), 25);
});

test('bandToPercent returns left and width for a span', () => {
  const { left, width } = bandToPercent(30, 150, 0, 180);
  assert.ok(Math.abs(left - 16.666) < 0.01);
  assert.ok(Math.abs(width - 66.666) < 0.01);
});

test('bandToPercent clamps a band that overflows the range', () => {
  const { left, width } = bandToPercent(-30, 210, 0, 180);
  assert.equal(left, 0);
  assert.equal(width, 100);
});
