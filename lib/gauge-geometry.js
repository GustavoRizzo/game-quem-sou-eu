// Pure geometry for a linear gauge: maps values onto a 0..100% track.
// No DOM — kept separate so it can be unit-tested and reused by the
// <value-gauge> component (and anything else that needs the same math).

// Clamps `value` to [min, max] and returns its position as a percentage.
export function valueToPercent(value, min, max) {
  const clamped = Math.min(max, Math.max(min, value));
  return ((clamped - min) / (max - min)) * 100;
}

// Returns { left, width } in percent for a band spanning [lo, hi].
export function bandToPercent(lo, hi, min, max) {
  const left = valueToPercent(lo, min, max);
  return { left, width: valueToPercent(hi, min, max) - left };
}
