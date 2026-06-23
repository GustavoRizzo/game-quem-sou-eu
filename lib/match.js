// Pure match state: walks through a deck of cards, records each as a hit or a
// skip, and knows when the deck is exhausted. No DOM, no timers — the page owns
// the clock and the sensors and just calls resolve() on each gesture.
//
// Ending the match has two triggers: the 60s timer (the page's concern) and
// running out of cards (isOver here). Either way the page calls toRecord() to
// get the persistable result.
//
// Only resolved cards (hit or skip) end up in the record. The page resolves
// the card still on screen at timeout as a skip before calling toRecord(), so
// it appears in the results list and counts in the statistics.

export const Result = {
  HIT: 'hit',
  SKIP: 'skip',
};

/** @typedef {'hit' | 'skip'} GameResult */

/**
 * One resolved card in a match.
 * @typedef {Object} MatchEntry
 * @property {string} word
 * @property {string} listId
 * @property {GameResult} result
 */

/**
 * The persistable result of a finished match (a plain, JSON-serializable
 * object — see lib/match-repository.js and lib/match-stats.js).
 * @typedef {Object} MatchRecord
 * @property {string} id
 * @property {string[]} mode        Selected category ids for this match.
 * @property {number} startedAt     Epoch ms when play began.
 * @property {number} endedAt       Epoch ms when the match ended.
 * @property {number} durationMs    Real elapsed time (endedAt - startedAt).
 * @property {MatchEntry[]} entries  Resolved cards, in the order shown.
 */

export class Match {
  #deck;
  #mode;
  #startedAt;
  #index = 0;
  #entries = [];

  // `deck` is an array of { word, listId } (see lib/deck.js).
  // `mode` is the list of selected category ids (stored for the record/stats).
  /**
   * @param {import('./deck.js').Card[]} deck
   * @param {{ mode?: string[], startedAt?: number }} [options]
   */
  constructor(deck, { mode, startedAt } = {}) {
    this.#deck = deck;
    this.#mode = mode ?? [];
    this.#startedAt = startedAt ?? 0;
  }

  // The card currently facing the player, or null if the deck is exhausted.
  /** @returns {import('./deck.js').Card | null} */
  get current() {
    return this.#deck[this.#index] ?? null;
  }

  get isOver() {
    return this.#index >= this.#deck.length;
  }

  get hits() {
    return this.#entries.filter((e) => e.result === Result.HIT).length;
  }

  // Number of cards resolved so far (hits + skips) = cards "shown".
  get resolved() {
    return this.#entries.length;
  }

  // Records the current card with the given result and advances. Ignored if the
  // deck is already exhausted. Returns the next card (or null).
  /**
   * @param {GameResult} result
   * @returns {import('./deck.js').Card | null}
   */
  resolve(result) {
    const card = this.current;
    if (card === null) return null;
    this.#entries.push({ word: card.word, listId: card.listId, result });
    this.#index++;
    return this.current;
  }

  // Builds the persistable record. `endedAt` is the wall/clock time the match
  // ended (same units as startedAt) used to derive the real duration.
  /**
   * @param {number} [endedAt]
   * @returns {MatchRecord}
   */
  toRecord(endedAt = this.#startedAt) {
    return {
      id: newMatchId(),
      mode: this.#mode,
      startedAt: this.#startedAt,
      endedAt,
      durationMs: Math.max(0, endedAt - this.#startedAt),
      entries: this.#entries.slice(),
    };
  }
}

// Best-effort unique id; crypto.randomUUID is available in our target browsers
// and in Node's test runner. Falls back to a timestamp+random string.
export function newMatchId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
