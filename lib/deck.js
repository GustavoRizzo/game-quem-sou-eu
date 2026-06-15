// Pure deck building for a match: turns the selected categories' words into a
// single shuffled draw pile of cards, with no repeats within a game.
//
// A "card" carries which list it came from ({ word, listId }) so the results
// and future per-word statistics can be attributed back to a category.
//
// No DOM, no fetch: the words come in already loaded, the RNG is injectable —
// so the shuffle (and therefore the whole pile) is deterministic under test.

// Fisher–Yates shuffle. Returns a new array; does not mutate the input.
// `rng` must return a float in [0, 1) like Math.random.
export function shuffle(items, rng = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Builds the shuffled draw pile from the selected lists.
// `lists` is an array of { id, words: string[] }; the result is a shuffled
// array of { word, listId }.
export function buildDeck(lists, rng = Math.random) {
  const cards = [];
  for (const { id, words } of lists) {
    for (const word of words) {
      cards.push({ word, listId: id });
    }
  }
  return shuffle(cards, rng);
}
