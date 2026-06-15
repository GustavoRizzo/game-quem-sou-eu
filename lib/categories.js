// Registry of word-list categories and a thin loader for their JSON data.
//
// The registry holds only display metadata (id + name), so a future "game mode"
// settings screen can list and pick categories without fetching every word.
// The actual words live in self-contained JSON files under assets/word-lists/
// (each: { id, name, words }), fetched on demand by loadCategoryWords().
//
// To add a category: drop a new JSON in assets/word-lists/ and add an entry
// here. Nothing else in the game needs to know the specific lists.

/**
 * A word-list category, as listed in the registry below.
 * @typedef {Object} Category
 * @property {string} id    Stable identifier, used in the game mode and records.
 * @property {string} name  Human-facing label (e.g. shown in a mode screen).
 * @property {string} file  JSON filename under assets/word-lists/.
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

// Fetches the words of one category. `basePath` is the URL prefix of the
// assets/word-lists/ folder relative to the calling page (the game page passes
// its own relative path). Returns the array of words.
/**
 * @param {Category} category
 * @param {{ basePath?: string }} [options]
 * @returns {Promise<string[]>}
 */
export async function loadCategoryWords(category, { basePath = '' } = {}) {
  const res = await fetch(`${basePath}${category.file}`);
  if (!res.ok) {
    throw new Error(`Failed to load category "${category.id}" (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.words;
}
