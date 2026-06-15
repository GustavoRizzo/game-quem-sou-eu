// Converts the raw DeviceOrientation gamma (-90..90) into a continuous
// "forehead tilt" angle centered on the on-forehead neutral (~90).
//
// Why: held on the forehead in landscape, the neutral gamma sits right at the
// ±90 singularity, where gamma folds — tilting one way decreases gamma from
// +90, tilting the other way makes it jump to -90 and rise. That fold puts the
// two gestures on different signs and leaves the "up" side with no range.
//
// Unwrapping maps +90 and -90 to the same center (90), so the value moves
// continuously through neutral: a "down" tilt goes below 90, an "up" tilt goes
// above 90. The detector can then treat both as a simple deviation from neutral.
//
// Operating region (the gestures) is gamma in [30..90] and [-90..-30], i.e.
// tilt in [30..150]; the discontinuity at gamma=0 (tilt 0 vs 180) lies outside
// it, in the "way off position" range.
export function foreheadTilt(gamma) {
  return gamma >= 0 ? gamma : gamma + 180;
}
