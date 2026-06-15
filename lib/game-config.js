// Default game configuration, centralized in one place so a future "settings"
// screen can let the player override these (and persist their own values).
// For now these are the baked-in defaults consumed by the gesture detector.
//
// Angles are in degrees (gamma axis); durations are in milliseconds.

export const DEFAULT_CONFIG = {
  // --- Neutral position (phone resting on the forehead) ---
  // Expressed in the unwrapped "forehead tilt" space (see lib/forehead-tilt.js),
  // where the on-forehead neutral sits at ~90 and both gestures are a deviation
  // from it (down -> below 90, up -> above 90). Raw gamma is unwrapped before
  // reaching the detector, so this value is a tilt, not a raw gamma.
  neutralGamma: 90,

  // --- Gesture detection ---
  triggerAngle: 35, // deviation from neutral that fires a gesture
  neutralBand: 15, // within this deviation the detector re-arms (hysteresis)
  cooldownMs: 800, // inputs ignored for this long after a detection
  // false: gamma DECREASING from neutral = hit (tilt down), increasing = skip.
  invertDirection: false,

  // --- Position check ---
  // A deviation larger than this, sustained for the debounce, means the phone
  // left the forehead -> pause and ask to reposition. The debounce is long
  // enough that a quick gesture (which also leaves neutral) does not trip it.
  // This also bounds the upper end of a valid gesture: a tilt beyond this is
  // treated as leaving position, not as a counted gesture.
  positionMaxDeviation: 60,
  positionDebounceMs: 1500,
};
