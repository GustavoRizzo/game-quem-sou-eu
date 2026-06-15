// Pure derivations for the results screen, computed from a match record
// (see Match.toRecord in lib/match.js). Kept separate and pure so the numbers
// shown to the player are unit-tested and reusable by a future history/stats
// screen.

/**
 * Derived figures shown on the results screen.
 * @typedef {Object} MatchSummary
 * @property {number} hits           Cards marked correct (the headline number).
 * @property {number} skips
 * @property {number} shown          Cards resolved (hits + skips).
 * @property {number} accuracy       Hits over shown, in 0..1.
 * @property {number} hitsPerSecond  Hits over the real duration.
 */

// Summarizes one match into the figures the results screen shows:
//  - hits: cards marked correct (the headline number)
//  - shown: cards resolved (hits + skips)
//  - skips, accuracy (0..1), hitsPerSecond
/**
 * @param {import('./match.js').MatchRecord} record
 * @returns {MatchSummary}
 */
export function summarize(record) {
  const entries = record.entries ?? [];
  const shown = entries.length;
  const hits = entries.filter((e) => e.result === 'hit').length;
  const skips = shown - hits;
  const seconds = (record.durationMs ?? 0) / 1000;
  return {
    hits,
    skips,
    shown,
    accuracy: shown > 0 ? hits / shown : 0,
    hitsPerSecond: seconds > 0 ? hits / seconds : 0,
  };
}
