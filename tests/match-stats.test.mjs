// Unit tests for lib/match-stats.js (pure results-screen derivations).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { summarize } from '../lib/match-stats.js';

function record(results, durationMs) {
  return {
    durationMs,
    entries: results.map((result, i) => ({ word: `w${i}`, listId: 'a', result })),
  };
}

test('counts hits, skips and shown', () => {
  const s = summarize(record(['hit', 'skip', 'hit', 'hit'], 60000));
  assert.equal(s.hits, 3);
  assert.equal(s.skips, 1);
  assert.equal(s.shown, 4);
});

test('accuracy is hits over shown', () => {
  const s = summarize(record(['hit', 'skip'], 60000));
  assert.equal(s.accuracy, 0.5);
});

test('hitsPerSecond uses the real duration', () => {
  const s = summarize(record(['hit', 'hit', 'hit'], 60000));
  assert.equal(s.hitsPerSecond, 0.05);
});

test('no division by zero when nothing was shown', () => {
  const s = summarize(record([], 60000));
  assert.equal(s.accuracy, 0);
  assert.equal(s.hitsPerSecond, 0);
  assert.equal(s.shown, 0);
});

test('zero duration does not blow up hitsPerSecond', () => {
  const s = summarize(record(['hit'], 0));
  assert.equal(s.hitsPerSecond, 0);
});
