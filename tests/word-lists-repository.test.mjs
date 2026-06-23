// Unit tests for lib/word-lists-repository.js: the pure helpers and the store,
// using an in-memory storage stub (no jsdom, no real localStorage), mirroring
// the project's testing approach.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  WordListsStore,
  defaultState,
  effectiveWords,
  mergeCategories,
  isCustomId,
} from '../lib/word-lists-repository.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

// --- Pure helpers ----------------------------------------------------------

test('effectiveWords tags each word active unless it is in the disabled set', () => {
  const result = effectiveWords(['Gato', 'Cão', 'Pato'], { disabled: ['Cão'] });
  assert.deepEqual(result, [
    { text: 'Gato', active: true },
    { text: 'Cão', active: false },
    { text: 'Pato', active: true },
  ]);
});

test('effectiveWords treats a missing override as everything active', () => {
  const result = effectiveWords(['A', 'B']);
  assert.deepEqual(result, [
    { text: 'A', active: true },
    { text: 'B', active: true },
  ]);
});

test('mergeCategories lists built-ins first (custom:false) then custom (custom:true)', () => {
  const merged = mergeCategories(
    [{ id: 'animais', name: 'Animais', file: 'animais.json' }],
    [{ id: 'custom-1', name: 'Minha', words: [] }]
  );
  assert.deepEqual(merged, [
    { id: 'animais', name: 'Animais', custom: false },
    { id: 'custom-1', name: 'Minha', custom: true },
  ]);
});

test('isCustomId only matches the custom- prefix', () => {
  assert.equal(isCustomId('custom-abc'), true);
  assert.equal(isCustomId('animais'), false);
  assert.equal(isCustomId(undefined), false);
});

// --- Built-in overrides (diff only) ----------------------------------------

test('a fresh store has no overrides and no custom lists', () => {
  const store = new WordListsStore(memoryStorage());
  assert.deepEqual(store.load(), defaultState());
});

test('disabling a built-in word stores only the diff; re-enabling clears it', () => {
  const store = new WordListsStore(memoryStorage());

  store.setBuiltinWord('animais', 'Gato', false);
  assert.deepEqual(store.overrideFor('animais'), { disabled: ['Gato'] });

  store.setBuiltinWord('animais', 'Gato', true);
  // Empty override is pruned, so the list stays "clean" (no entry).
  assert.deepEqual(store.load().overrides, {});
});

test('toggleBuiltinWord flips a word on and off', () => {
  const store = new WordListsStore(memoryStorage());
  store.toggleBuiltinWord('paises', 'Brasil');
  assert.deepEqual(store.overrideFor('paises').disabled, ['Brasil']);
  store.toggleBuiltinWord('paises', 'Brasil');
  assert.deepEqual(store.overrideFor('paises').disabled, []);
});

test('setAllBuiltinWords disables every word, or clears the override when enabling', () => {
  const store = new WordListsStore(memoryStorage());
  store.setAllBuiltinWords('animais', ['Gato', 'Cão'], false);
  assert.deepEqual(store.overrideFor('animais').disabled, ['Gato', 'Cão']);
  store.setAllBuiltinWords('animais', ['Gato', 'Cão'], true);
  assert.deepEqual(store.load().overrides, {});
});

// --- Custom lists ----------------------------------------------------------

test('createList returns a custom-prefixed list and persists it', () => {
  const store = new WordListsStore(memoryStorage());
  const list = store.createList('  Festa  ');
  assert.ok(isCustomId(list.id));
  assert.equal(list.name, 'Festa'); // trimmed
  assert.deepEqual(store.customLists().map((l) => l.id), [list.id]);
});

test('addWord appends active words and ignores case-insensitive duplicates', () => {
  const store = new WordListsStore(memoryStorage());
  const { id } = store.createList('Festa');
  store.addWord(id, 'Pizza');
  store.addWord(id, 'pizza'); // duplicate, ignored
  store.addWord(id, '  ');    // blank, ignored
  assert.deepEqual(store.customList(id).words, [{ text: 'Pizza', active: true }]);
});

test('toggleWord and removeWord act on the named word', () => {
  const store = new WordListsStore(memoryStorage());
  const { id } = store.createList('Festa');
  store.addWord(id, 'Pizza');
  store.addWord(id, 'Bolo');

  store.toggleWord(id, 'Pizza');
  assert.equal(store.customList(id).words.find((w) => w.text === 'Pizza').active, false);

  store.removeWord(id, 'Bolo');
  assert.deepEqual(store.customList(id).words.map((w) => w.text), ['Pizza']);
});

test('setAllCustomWords flips every word at once', () => {
  const store = new WordListsStore(memoryStorage());
  const { id } = store.createList('Festa');
  store.addWord(id, 'A');
  store.addWord(id, 'B');
  store.setAllCustomWords(id, false);
  assert.deepEqual(store.customList(id).words.map((w) => w.active), [false, false]);
});

test('renameList and deleteList manage the list', () => {
  const store = new WordListsStore(memoryStorage());
  const { id } = store.createList('Antiga');
  store.renameList(id, 'Nova');
  assert.equal(store.customList(id).name, 'Nova');
  store.deleteList(id);
  assert.equal(store.customList(id), null);
});

test('mutating an unknown custom id is a no-op (no throw)', () => {
  const store = new WordListsStore(memoryStorage());
  assert.doesNotThrow(() => store.addWord('custom-nope', 'X'));
  assert.deepEqual(store.customLists(), []);
});

test('corrupt storage is treated as the defaults, not an error', () => {
  const storage = memoryStorage();
  storage.setItem('quem-sou-eu:word-lists', '{not valid json');
  const store = new WordListsStore(storage);
  assert.deepEqual(store.load(), defaultState());
});
