// Pure gesture-detection state machine: no DOM, no sensors. Feed it gamma
// samples with timestamps via process(); it emits events through the callback.
// Kept pure so it is unit-testable and reusable by the real game.
//
// Model (relative to a neutral gamma):
//  - HIT  when gamma crosses the trigger threshold on the "down" side
//         (gamma decreasing), SKIP on the opposite side; invertDirection swaps.
//  - After firing it disarms; it re-arms only after returning to the neutral
//    band AND the cooldown elapsing. Together these prevent the return/overshoot
//    of one gesture from being counted as the opposite gesture.
//  - A large deviation sustained past the debounce means the phone left the
//    forehead (REPOSITION); a brief excursion (a gesture) does not trip it.

export const GestureEvent = {
  HIT: 'hit',
  SKIP: 'skip',
  REPOSITION: 'reposition',
  POSITIONED: 'positioned',
  ARMED: 'armed',
};

export class GestureDetector {
  #config;
  #onEvent;
  #armed = false;
  #cooldownUntil = 0;
  #outOfPosition = false;
  #offSince = null;

  constructor(config, onEvent) {
    this.#config = config;
    this.#onEvent = onEvent ?? (() => {});
  }

  get armed() {
    return this.#armed;
  }

  get outOfPosition() {
    return this.#outOfPosition;
  }

  reset() {
    this.#armed = false;
    this.#cooldownUntil = 0;
    this.#outOfPosition = false;
    this.#offSince = null;
  }

  // Process one orientation sample. `now` is a timestamp in milliseconds.
  process(gamma, now) {
    const c = this.#config;
    const offset = gamma - c.neutralGamma; // signed deviation from neutral
    const deviation = Math.abs(offset);

    // --- Position check ---
    if (deviation > c.positionMaxDeviation) {
      if (this.#offSince === null) this.#offSince = now;
      if (!this.#outOfPosition && now - this.#offSince >= c.positionDebounceMs) {
        this.#outOfPosition = true;
        this.#armed = false;
        this.#emit(GestureEvent.REPOSITION);
      }
    } else {
      this.#offSince = null;
      if (this.#outOfPosition) {
        this.#outOfPosition = false;
        this.#emit(GestureEvent.POSITIONED);
      }
    }
    if (this.#outOfPosition) return;

    // --- Re-arm once settled near neutral and past the cooldown ---
    if (!this.#armed && now >= this.#cooldownUntil && deviation <= c.neutralBand) {
      this.#armed = true;
      this.#emit(GestureEvent.ARMED);
    }

    // --- Fire when crossing the trigger while armed ---
    // A gesture lives in the band [triggerAngle, positionMaxDeviation]; a larger
    // deviation is the phone leaving the forehead, not a gesture, so it must not
    // be counted (e.g. swinging the phone off the head).
    if (
      this.#armed &&
      now >= this.#cooldownUntil &&
      deviation >= c.triggerAngle &&
      deviation <= c.positionMaxDeviation
    ) {
      const tiltedDown = offset < 0; // gamma decreased from neutral
      const isHit = c.invertDirection ? !tiltedDown : tiltedDown;
      this.#armed = false;
      this.#cooldownUntil = now + c.cooldownMs;
      this.#emit(isHit ? GestureEvent.HIT : GestureEvent.SKIP);
    }
  }

  #emit(type) {
    this.#onEvent({ type });
  }
}
