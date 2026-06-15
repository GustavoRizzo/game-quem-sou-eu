// Registry of word-list categories and a thin loader for their JSON data.
//
// The registry holds only display metadata (id + name), so a future "game mode"
// settings screen can list and pick categories without fetching every word.
// The actual words live in self-contained JSON files under assets/word-lists/
// (each: { id, name, words }), fetched on demand by loadCategoryWords().
//
// To add a category: drop a new JSON in assets/word-lists/ and add an entry
// here. Nothing else in the game needs to know the specific lists.

export const CATEGORIES = [
  { id: 'animais', name: 'Animais', file: 'animais.json' },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}

// Fetches the words of one category. `basePath` is the URL prefix of the
// assets/word-lists/ folder relative to the calling page (the game page passes
// its own relative path). Returns the array of words.
export async function loadCategoryWords(category, { basePath = '' } = {}) {
  const res = await fetch(`${basePath}${category.file}`);
  if (!res.ok) {
    throw new Error(`Failed to load category "${category.id}" (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.words;
}
