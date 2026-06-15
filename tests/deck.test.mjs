// Unit tests for lib/deck.js (pure deck building and shuffle).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shuffle, buildDeck } from '../lib/deck.js';

// A deterministic RNG: replays the given sequence of floats in [0,1).
function seq(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('shuffle does not mutate the input and keeps the same elements', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, seq([0, 0, 0, 0]));
  assert.notEqual(out, input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [...input].sort());
});

test('shuffle is deterministic given the RNG', () => {
  // rng() = 0 always -> Fisher-Yates swaps each i with index 0, rotating.
  const out = shuffle([1, 2, 3], seq([0]));
  assert.deepEqual(out, [2, 3, 1]);
});

test('buildDeck flattens all lists into { word, listId } cards', () => {
  const lists = [
    { id: 'animais', words: ['Gato', 'Cão'] },
    { id: 'paises', words: ['Brasil'] },
  ];
  // identity-ish RNG (0) keeps a predictable order to assert content
  const deck = buildDeck(lists, seq([0]));
  assert.equal(deck.length, 3);
  for (const card of deck) {
    assert.ok('word' in card && 'listId' in card);
  }
  const fromPaises = deck.filter((c) => c.listId === 'paises');
  assert.deepEqual(fromPaises, [{ word: 'Brasil', listId: 'paises' }]);
});

test('buildDeck preserves every word exactly once (no repeats added/lost)', () => {
  const lists = [{ id: 'a', words: ['x', 'y', 'z'] }];
  const deck = buildDeck(lists, seq([0.1, 0.5, 0.9]));
  assert.deepEqual(
    deck.map((c) => c.word).sort(),
    ['x', 'y', 'z']
  );
});
