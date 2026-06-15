// Unit tests for lib/match-repository.js using an in-memory storage stub
// (no jsdom, no real localStorage), mirroring the project's testing approach.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MatchRepository } from '../lib/match-repository.js';

// Minimal Web Storage stub: just the three methods the repository uses.
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function rec(id, startedAt, results = ['hit']) {
  return {
    id,
    startedAt,
    durationMs: 60000,
    mode: ['animais'],
    entries: results.map((result) => ({ word: 'w', listId: 'animais', result })),
  };
}

test('list is empty on a fresh store', () => {
  const repo = new MatchRepository(memoryStorage());
  assert.deepEqual(repo.list(), []);
});

test('save then list returns the record', () => {
  const repo = new MatchRepository(memoryStorage());
  repo.save(rec('a', 1000));
  const all = repo.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, 'a');
});

test('list returns matches newest first', () => {
  const repo = new MatchRepository(memoryStorage());
  repo.save(rec('old', 1000));
  repo.save(rec('new', 5000));
  assert.deepEqual(repo.list().map((m) => m.id), ['new', 'old']);
});

test('clear empties the store', () => {
  const repo = new MatchRepository(memoryStorage());
  repo.save(rec('a', 1000));
  repo.clear();
  assert.deepEqual(repo.list(), []);
});

test('corrupt storage is treated as empty, not an error', () => {
  const storage = memoryStorage();
  storage.setItem('qse:matches', '{not valid json');
  const repo = new MatchRepository(storage);
  assert.deepEqual(repo.list(), []);
});

test('export then import (replace) round-trips into a fresh repo', () => {
  const src = new MatchRepository(memoryStorage());
  src.save(rec('a', 1000));
  src.save(rec('b', 2000));
  const blob = src.exportJSON();

  const dst = new MatchRepository(memoryStorage());
  const added = dst.importJSON(blob, { merge: false });
  assert.equal(added, 2);
  assert.deepEqual(dst.list().map((m) => m.id).sort(), ['a', 'b']);
});

test('import with merge skips records already present by id', () => {
  const repo = new MatchRepository(memoryStorage());
  repo.save(rec('a', 1000));
  const blob = new MatchRepository(memoryStorage());
  blob.save(rec('a', 1000)); // duplicate id
  blob.save(rec('c', 3000)); // new
  const added = repo.importJSON(blob.exportJSON(), { merge: true });
  assert.equal(added, 1);
  assert.deepEqual(repo.list().map((m) => m.id), ['c', 'a']);
});
