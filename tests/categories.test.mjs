// Unit tests for lib/categories.js: the pure registry lookup and the fetch
// loader (with a stubbed global fetch — no real network, no jsdom).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CATEGORIES, categoryById, loadCategoryWords } from '../lib/categories.js';

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
