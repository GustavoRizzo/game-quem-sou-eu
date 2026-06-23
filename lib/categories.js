// Registry of word-list categories and a thin loader for their JSON data.
//
// The registry holds only display metadata (id + name), so a future "game mode"
// settings screen can list and pick categories without fetching every word.
// The actual words live in self-contained JSON files under assets/word-lists/
// (each: { id, name, words }), fetched on demand by loadCategoryWords().
//
// To add a category: drop a new JSON in assets/word-lists/ and add an entry
// here. Nothing else in the game needs to know the specific lists.
//
// On top of these built-in lists, the player can disable individual words and
// create their own lists; those edits live in lib/word-lists-repository.js and
// are merged in here (see listCategories / findCategory / loadCategoryWords),
// so the game and settings see one unified set of categories and only the
// active words.

import {
  WordListsRepository,
  effectiveWords,
  mergeCategories,
  isCustomId,
} from './word-lists-repository.js';

/**
 * A word-list category, as listed in the registry below.
 * @typedef {Object} Category
 * @property {string} id    Stable identifier, used in the game mode and records.
 * @property {string} name  Human-facing label (e.g. shown in a mode screen).
 * @property {string} [file]  JSON filename under assets/word-lists/ (built-in only).
 * @property {boolean} [custom]  True for player-created lists.
 */

/** @type {Category[]} */
export const CATEGORIES = [
  { id: 'animais',          name: 'Animais',           file: 'animais.json' },
  { id: 'paises',           name: 'Países',            file: 'paises.json' },
  { id: 'pontos-turisticos',name: 'Pontos Turísticos', file: 'pontos-turisticos.json' },
  { id: 'marcas',           name: 'Marcas',            file: 'marcas.json' },
  { id: 'filmes',           name: 'Filmes',            file: 'filmes.json' },
  { id: 'games',            name: 'Games',             file: 'games.json' },
  { id: 'bandas',           name: 'Bandas',            file: 'bandas.json' },
  { id: 'personalidades',   name: 'Personalidades',    file: 'personalidades.json' },
];

/**
 * @param {string} id
 * @returns {Category | null}
 */
export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

// The unified list of categories the player can pick from: built-in lists plus
// their own custom lists (custom: true). Synchronous — custom lists live in
// localStorage, which is synchronous.
/**
 * @param {WordListsRepository} [repo]
 * @returns {{ id: string, name: string, custom: boolean }[]}
 */
export function listCategories(repo = WordListsRepository) {
  return mergeCategories(CATEGORIES, repo.customLists());
}

// Resolves a category id to its descriptor, looking in both the built-in
// registry and the player's custom lists.
/**
 * @param {string} id
 * @param {WordListsRepository} [repo]
 * @returns {Category | null}
 */
export function findCategory(id, repo = WordListsRepository) {
  if (isCustomId(id)) {
    const list = repo.customList(id);
    return list ? { id: list.id, name: list.name, custom: true } : null;
  }
  return categoryById(id);
}

// Fetches the raw JSON words of a built-in category. `basePath` is the URL
// prefix of the assets/word-lists/ folder relative to the calling page.
/**
 * @param {Category} category
 * @param {{ basePath?: string }} [options]
 * @returns {Promise<string[]>}
 */
async function fetchBuiltinWords(category, { basePath = '' } = {}) {
  const res = await fetch(`${basePath}${category.file}`);
  if (!res.ok) {
    throw new Error(`Failed to load category "${category.id}" (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.words;
}

// The words to PLAY a category with: only the active ones, with the player's
// edits applied (built-in: minus disabled words; custom: stored active words).
/**
 * @param {Category} category
 * @param {{ basePath?: string, repo?: WordListsRepository }} [options]
 * @returns {Promise<string[]>}
 */
export async function loadCategoryWords(category, { basePath = '', repo = WordListsRepository } = {}) {
  if (isCustomId(category.id)) {
    const list = repo.customList(category.id);
    return (list?.words ?? []).filter((w) => w.active).map((w) => w.text);
  }
  const words = await fetchBuiltinWords(category, { basePath });
  return effectiveWords(words, repo.overrideFor(category.id))
    .filter((w) => w.active)
    .map((w) => w.text);
}

// The words to EDIT a category with: every word tagged active/inactive. Used by
// the list editor (built-in: JSON words + override; custom: stored words).
/**
 * @param {Category} category
 * @param {{ basePath?: string, repo?: WordListsRepository }} [options]
 * @returns {Promise<import('./word-lists-repository.js').EditableWord[]>}
 */
export async function loadEditableWords(category, { basePath = '', repo = WordListsRepository } = {}) {
  if (isCustomId(category.id)) {
    return (repo.customList(category.id)?.words ?? []).map((w) => ({ ...w }));
  }
  const words = await fetchBuiltinWords(category, { basePath });
  return effectiveWords(words, repo.overrideFor(category.id));
}
