// Persistence for the player's edits to the word lists, layered on top of the
// static built-in lists (lib/categories.js + assets/word-lists/*.json).
//
// Two kinds of edits are stored:
//   - overrides: per built-in list, only the DIFF — the set of words the player
//     turned off. The built-in words still come from the JSON, so words added in
//     a future app update show up active automatically.
//   - custom: full player-created lists, each word carrying its own active flag,
//     so it can be toggled, added or removed.
//
// Same injectable-storage pattern as lib/settings-repository.js and
// lib/match-repository.js: the Web Storage backend defaults to
// globalThis.localStorage but is injectable, so this is unit-testable with a
// plain in-memory stub and imports cleanly in Node (it never touches storage
// until a method is called).
//
// Stored shape (wrapped with a version, leaving room for future migrations):
//   { version: 1,
//     overrides: { [builtinId]: { disabled: ["Gato", ...] } },
//     custom: [ { id, name, words: [ { text, active } ] } ] }

const STORAGE_KEY = 'quem-sou-eu:word-lists';
const SCHEMA_VERSION = 1;

const CUSTOM_PREFIX = 'custom-';

export function defaultState() {
  return { version: SCHEMA_VERSION, overrides: {}, custom: [] };
}

// --- Pure helpers (no storage / DOM) ---------------------------------------

/**
 * A word with its on/off state, as shown in the list editor.
 * @typedef {{ text: string, active: boolean }} EditableWord
 */

// Applies a built-in list's override (a set of disabled words) to its JSON
// words, returning each word tagged with whether it is currently active.
/**
 * @param {string[]} builtinWords
 * @param {{ disabled?: string[] }} [override]
 * @returns {EditableWord[]}
 */
export function effectiveWords(builtinWords, override = {}) {
  const disabled = new Set(override.disabled ?? []);
  return builtinWords.map((text) => ({ text, active: !disabled.has(text) }));
}

// Unifies the built-in registry and the player's custom lists into one list of
// categories (built-in first, then custom), each tagged so callers can tell
// them apart.
/**
 * @param {{ id: string, name: string }[]} builtinRegistry
 * @param {{ id: string, name: string }[]} customLists
 * @returns {{ id: string, name: string, custom: boolean }[]}
 */
export function mergeCategories(builtinRegistry, customLists) {
  return [
    ...builtinRegistry.map((c) => ({ id: c.id, name: c.name, custom: false })),
    ...customLists.map((c) => ({ id: c.id, name: c.name, custom: true })),
  ];
}

export function isCustomId(id) {
  return typeof id === 'string' && id.startsWith(CUSTOM_PREFIX);
}

// --- Repository ------------------------------------------------------------

export class WordListsStore {
  #storage;
  #key;

  constructor(storage = globalThis.localStorage, key = STORAGE_KEY) {
    this.#storage = storage;
    this.#key = key;
  }

  // Whole state. Tolerates missing/corrupt data — and a missing backend (e.g.
  // Node, where there is no localStorage) — by returning the defaults.
  load() {
    if (!this.#storage) return defaultState();
    return parse(this.#storage.getItem(this.#key));
  }

  save(state) {
    if (!this.#storage) return;
    this.#storage.setItem(this.#key, JSON.stringify(state));
  }

  reset() {
    this.#storage?.removeItem(this.#key);
  }

  // -- Built-in lists: only the disabled-words diff is persisted -------------

  /** @returns {{ disabled: string[] }} */
  overrideFor(builtinId) {
    return this.load().overrides[builtinId] ?? { disabled: [] };
  }

  setBuiltinWord(builtinId, word, active) {
    const state = this.load();
    const disabled = new Set(state.overrides[builtinId]?.disabled ?? []);
    if (active) disabled.delete(word);
    else disabled.add(word);
    if (disabled.size === 0) delete state.overrides[builtinId];
    else state.overrides[builtinId] = { disabled: [...disabled] };
    this.save(state);
    return state;
  }

  toggleBuiltinWord(builtinId, word) {
    const disabled = new Set(this.overrideFor(builtinId).disabled);
    return this.setBuiltinWord(builtinId, word, disabled.has(word));
  }

  // Disables (active=false) or enables (active=true) every word of a built-in
  // list at once. `allWords` is the list's full set of JSON words.
  setAllBuiltinWords(builtinId, allWords, active) {
    const state = this.load();
    if (active) delete state.overrides[builtinId];
    else state.overrides[builtinId] = { disabled: [...allWords] };
    this.save(state);
    return state;
  }

  // -- Custom lists ----------------------------------------------------------

  /** @returns {{ id, name, words: EditableWord[] }[]} */
  customLists() {
    return this.load().custom;
  }

  /** @returns {{ id, name, words: EditableWord[] } | null} */
  customList(id) {
    return this.load().custom.find((l) => l.id === id) ?? null;
  }

  // Creates an empty custom list and returns it (with its generated id).
  createList(name) {
    const state = this.load();
    const list = { id: makeCustomId(), name: name.trim(), words: [] };
    state.custom.push(list);
    this.save(state);
    return list;
  }

  renameList(id, name) {
    return this.#mutateList(id, (list) => {
      list.name = name.trim();
    });
  }

  deleteList(id) {
    const state = this.load();
    state.custom = state.custom.filter((l) => l.id !== id);
    this.save(state);
    return state;
  }

  // Adds a word if it isn't already present (case-insensitive). New words start
  // active. Returns the updated state.
  addWord(id, text) {
    const word = text.trim();
    return this.#mutateList(id, (list) => {
      if (!word) return;
      const exists = list.words.some((w) => w.text.toLowerCase() === word.toLowerCase());
      if (!exists) list.words.push({ text: word, active: true });
    });
  }

  removeWord(id, text) {
    return this.#mutateList(id, (list) => {
      list.words = list.words.filter((w) => w.text !== text);
    });
  }

  toggleWord(id, text) {
    return this.#mutateList(id, (list) => {
      const word = list.words.find((w) => w.text === text);
      if (word) word.active = !word.active;
    });
  }

  setAllCustomWords(id, active) {
    return this.#mutateList(id, (list) => {
      list.words.forEach((w) => (w.active = active));
    });
  }

  #mutateList(id, fn) {
    const state = this.load();
    const list = state.custom.find((l) => l.id === id);
    if (list) {
      fn(list);
      this.save(state);
    }
    return state;
  }
}

export const WordListsRepository = new WordListsStore();

// --- Internals -------------------------------------------------------------

function makeCustomId() {
  return `${CUSTOM_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Parses stored text into a normalized state, never throwing on bad input — a
// corrupt store should not break the game or the editor.
function parse(text) {
  if (!text) return defaultState();
  try {
    const data = JSON.parse(text);
    return {
      version: data.version ?? SCHEMA_VERSION,
      overrides: data.overrides && typeof data.overrides === 'object' ? data.overrides : {},
      custom: Array.isArray(data.custom) ? data.custom : [],
    };
  } catch {
    return defaultState();
  }
}
