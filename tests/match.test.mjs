// Unit tests for lib/match.js (pure match state machine).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Match, Result } from '../lib/match.js';

function makeDeck(words) {
  return words.map((word) => ({ word, listId: 'animais' }));
}

test('starts on the first card and is not over', () => {
  const m = new Match(makeDeck(['Gato', 'Cão']), { mode: ['animais'] });
  assert.deepEqual(m.current, { word: 'Gato', listId: 'animais' });
  assert.equal(m.isOver, false);
});

test('resolve records the card and advances to the next', () => {
  const m = new Match(makeDeck(['Gato', 'Cão']));
  const next = m.resolve(Result.HIT);
  assert.deepEqual(next, { word: 'Cão', listId: 'animais' });
  assert.equal(m.resolved, 1);
  assert.equal(m.hits, 1);
});

test('becomes over and returns null after the last card', () => {
  const m = new Match(makeDeck(['Gato']));
  assert.equal(m.resolve(Result.SKIP), null);
  assert.equal(m.isOver, true);
  assert.equal(m.current, null);
});

test('resolve is a no-op once the deck is exhausted', () => {
  const m = new Match(makeDeck(['Gato']));
  m.resolve(Result.HIT);
  m.resolve(Result.HIT); // extra call, nothing left
  assert.equal(m.resolved, 1);
  assert.equal(m.hits, 1);
});

test('counts hits and skips separately', () => {
  const m = new Match(makeDeck(['a', 'b', 'c', 'd']));
  m.resolve(Result.HIT);
  m.resolve(Result.SKIP);
  m.resolve(Result.HIT);
  assert.equal(m.hits, 2);
  assert.equal(m.resolved, 3);
});

test('toRecord captures entries, mode and a derived duration', () => {
  const m = new Match(makeDeck(['a', 'b']), { mode: ['animais'], startedAt: 1000 });
  m.resolve(Result.HIT);
  m.resolve(Result.SKIP);
  const rec = m.toRecord(61000);
  assert.equal(rec.durationMs, 60000);
  assert.deepEqual(rec.mode, ['animais']);
  assert.equal(rec.entries.length, 2);
  assert.deepEqual(rec.entries[0], { word: 'a', listId: 'animais', result: 'hit' });
  assert.ok(typeof rec.id === 'string' && rec.id.length > 0);
});

test('the page can resolve the on-screen card as skip before recording timeout', () => {
  // timer expires with 'b' still showing -> page calls resolve(SKIP) then toRecord()
  const m = new Match(makeDeck(['a', 'b']), { startedAt: 0 });
  m.resolve(Result.HIT);
  if (m.current !== null) m.resolve(Result.SKIP); // simulates what endMatch('timeout') does
  const rec = m.toRecord(60000);
  assert.equal(rec.entries.length, 2);
  assert.deepEqual(rec.entries[1], { word: 'b', listId: 'animais', result: 'skip' });
});

test('duration never goes negative', () => {
  const m = new Match(makeDeck(['a']), { startedAt: 5000 });
  const rec = m.toRecord(4000);
  assert.equal(rec.durationMs, 0);
});
