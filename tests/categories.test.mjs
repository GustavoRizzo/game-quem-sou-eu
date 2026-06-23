// Unit tests for lib/categories.js: the pure registry lookup and the fetch
// loader (with a stubbed global fetch — no real network, no jsdom).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORIES,
  categoryById,
  loadCategoryWords,
  listCategories,
  findCategory,
  loadEditableWords,
} from '../lib/categories.js';
import { WordListsStore } from '../lib/word-lists-repository.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('CATEGORIES has unique, non-empty ids', () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.ok(ids.length > 0);
  assert.deepEqual(ids, [...new Set(ids)]);
});

test('categoryById finds a known category', () => {
  assert.equal(categoryById('animais')?.name, 'Animais');
});

test('categoryById returns null for an unknown id', () => {
  assert.equal(categoryById('nao-existe'), null);
});

test('loadCategoryWords fetches basePath + file and returns the words', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ words: ['Gato', 'Cão'] }) };
  };
  try {
    const words = await loadCategoryWords(
      { id: 'animais', file: 'animais.json' },
      { basePath: '../../assets/word-lists/' }
    );
    assert.deepEqual(words, ['Gato', 'Cão']);
    assert.deepEqual(calls, ['../../assets/word-lists/animais.json']);
  } finally {
    delete globalThis.fetch;
  }
});

test('loadCategoryWords throws with the category id and HTTP status on failure', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try {
    await assert.rejects(
      () => loadCategoryWords({ id: 'animais', file: 'animais.json' }),
      /Failed to load category "animais" \(HTTP 404\)/
    );
  } finally {
    delete globalThis.fetch;
  }
});

// --- Edits layered on top: overrides + custom lists ------------------------

test('listCategories merges built-ins (custom:false) with custom lists (custom:true)', () => {
  const repo = new WordListsStore(memoryStorage());
  repo.createList('Festa');
  const cats = listCategories(repo);
  assert.equal(cats.length, CATEGORIES.length + 1);
  assert.equal(cats[0].custom, false);
  assert.equal(cats.at(-1).custom, true);
  assert.equal(cats.at(-1).name, 'Festa');
});

test('findCategory resolves both a built-in id and a custom id, null otherwise', () => {
  const repo = new WordListsStore(memoryStorage());
  const { id } = repo.createList('Festa');
  assert.equal(findCategory('animais', repo)?.name, 'Animais');
  assert.equal(findCategory(id, repo)?.custom, true);
  assert.equal(findCategory('custom-gone', repo), null);
});

test('loadCategoryWords drops a built-in list\'s disabled words', async () => {
  const repo = new WordListsStore(memoryStorage());
  repo.setBuiltinWord('animais', 'Cão', false);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ words: ['Gato', 'Cão', 'Pato'] }) });
  try {
    const words = await loadCategoryWords({ id: 'animais', file: 'animais.json' }, { repo });
    assert.deepEqual(words, ['Gato', 'Pato']);
  } finally {
    delete globalThis.fetch;
  }
});

test('loadCategoryWords reads a custom list from storage (no fetch) and returns only active words', async () => {
  const repo = new WordListsStore(memoryStorage());
  const { id } = repo.createList('Festa');
  repo.addWord(id, 'Pizza');
  repo.addWord(id, 'Bolo');
  repo.toggleWord(id, 'Bolo'); // disable
  globalThis.fetch = async () => {
    throw new Error('custom lists must not hit the network');
  };
  try {
    const words = await loadCategoryWords(findCategory(id, repo), { repo });
    assert.deepEqual(words, ['Pizza']);
  } finally {
    delete globalThis.fetch;
  }
});

test('loadEditableWords returns every word tagged active/inactive for the editor', async () => {
  const repo = new WordListsStore(memoryStorage());
  repo.setBuiltinWord('animais', 'Cão', false);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ words: ['Gato', 'Cão'] }) });
  try {
    const words = await loadEditableWords({ id: 'animais', file: 'animais.json' }, { repo });
    assert.deepEqual(words, [
      { text: 'Gato', active: true },
      { text: 'Cão', active: false },
    ]);
  } finally {
    delete globalThis.fetch;
  }
});
