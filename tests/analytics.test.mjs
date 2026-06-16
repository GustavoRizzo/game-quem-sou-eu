// Unit tests for lib/analytics.js's track() helper.
// The GA-loading side effect is gated on the GA_ID placeholder being
// replaced (see deploy.yml), which never happens when running under Node, so
// importing the module here never touches window.dataLayer/document.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { track } from '../lib/analytics.js';

beforeEach(() => {
  globalThis.window = {};
});

test('track calls gtag with the event name and params when gtag is loaded', () => {
  const calls = [];
  window.gtag = (...args) => calls.push(args);
  track('game_start', { duration: 60 });
  assert.deepEqual(calls, [['event', 'game_start', { duration: 60 }]]);
});

test('track defaults params to an empty object', () => {
  const calls = [];
  window.gtag = (...args) => calls.push(args);
  track('play_again');
  assert.deepEqual(calls, [['event', 'play_again', {}]]);
});

test('track is a no-op when gtag is not loaded (dev, or blocked)', () => {
  assert.doesNotThrow(() => track('game_start'));
});
