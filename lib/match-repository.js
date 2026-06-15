// Persistence for finished matches.
//
// Per the agreed plan, this hides the storage technology behind a small
// interface (save / list / clear / export / import). Today it is backed by
// localStorage, which is plenty for the small data volume and fits the
// zero-dependency, client-only constraint of a GitHub Pages site. When query
// volume or cross-screen statistics demand it, the backend can move to
// IndexedDB without the game or results code changing.
//
// The Web Storage backend is injected (defaulting to globalThis.localStorage),
// so the repository is unit-testable with a plain in-memory stub — and the
// module imports cleanly in Node, where there is no localStorage.
//
// Stored shape is wrapped with a version, leaving room for future migrations:
//   { version: 1, matches: [ <record>, ... ] }

const STORAGE_KEY = 'qse:matches';
const SCHEMA_VERSION = 1;

export class MatchRepository {
  #storage;
  #key;

  constructor(storage = globalThis.localStorage, key = STORAGE_KEY) {
    this.#storage = storage;
    this.#key = key;
  }

  // All matches, newest first. Tolerates missing/corrupt data by returning [].
  list() {
    return this.#read().matches.slice().sort((a, b) => b.startedAt - a.startedAt);
  }

  // Appends a finished match record. Returns the saved record.
  save(record) {
    const data = this.#read();
    data.matches.push(record);
    this.#write(data);
    return record;
  }

  clear() {
    this.#storage.removeItem(this.#key);
  }

  // Serializes everything for a manual backup/export.
  exportJSON() {
    return JSON.stringify(this.#read());
  }

  // Imports a previously exported blob. With { merge: true } (default) it adds
  // records not already present (by id); otherwise it replaces the store.
  // Returns the number of records added.
  importJSON(text, { merge = true } = {}) {
    const incoming = parse(text).matches;
    if (!merge) {
      this.#write({ version: SCHEMA_VERSION, matches: incoming });
      return incoming.length;
    }
    const data = this.#read();
    const known = new Set(data.matches.map((m) => m.id));
    const added = incoming.filter((m) => !known.has(m.id));
    data.matches.push(...added);
    this.#write(data);
    return added.length;
  }

  #read() {
    return parse(this.#storage.getItem(this.#key));
  }

  #write(data) {
    this.#storage.setItem(this.#key, JSON.stringify(data));
  }
}

// Parses stored/imported text into a normalized { version, matches } object,
// never throwing on bad input — a corrupt store should not break the game.
function parse(text) {
  if (!text) return { version: SCHEMA_VERSION, matches: [] };
  try {
    const data = JSON.parse(text);
    return { version: data.version ?? SCHEMA_VERSION, matches: Array.isArray(data.matches) ? data.matches : [] };
  } catch {
    return { version: SCHEMA_VERSION, matches: [] };
  }
}
