// Reusable wrapper around the device motion sensor APIs
// (DeviceOrientationEvent / DeviceMotionEvent).
// Keeps sensor access isolated from UI and game logic.

export function isMotionSupported() {
  return (
    window.isSecureContext &&
    'DeviceOrientationEvent' in window &&
    'DeviceMotionEvent' in window
  );
}

export class MotionSensors {
  #onOrientation;
  #onMotion;
  #handlers = null;

  constructor({ onOrientation = null, onMotion = null } = {}) {
    this.#onOrientation = onOrientation;
    this.#onMotion = onMotion;
  }

  get running() {
    return this.#handlers !== null;
  }

  async start() {
    if (this.running) return;
    await MotionSensors.#requestPermissionIfNeeded();

    this.#handlers = {
      orientation: (event) =>
        this.#onOrientation?.({
          // Rotation of the device frame relative to the Earth frame, in degrees:
          // alpha: around Z (0..360), beta: around X (-180..180), gamma: around Y (-90..90)
          alpha: event.alpha,
          beta: event.beta,
          gamma: event.gamma,
          absolute: event.absolute,
        }),
      motion: (event) =>
        this.#onMotion?.({
          acceleration: event.acceleration, // m/s², gravity excluded
          accelerationIncludingGravity: event.accelerationIncludingGravity,
          rotationRate: event.rotationRate, // deg/s around each axis
          interval: event.interval, // ms between hardware samples
        }),
    };

    window.addEventListener('deviceorientation', this.#handlers.orientation);
    window.addEventListener('devicemotion', this.#handlers.motion);
  }

  stop() {
    if (!this.running) return;
    window.removeEventListener('deviceorientation', this.#handlers.orientation);
    window.removeEventListener('devicemotion', this.#handlers.motion);
    this.#handlers = null;
  }

  // iOS Safari requires an explicit user-gesture permission request.
  // Android Chrome (our target) grants access automatically, so this is a no-op there.
  static async #requestPermissionIfNeeded() {
    for (const eventClass of [window.DeviceOrientationEvent, window.DeviceMotionEvent]) {
      if (typeof eventClass?.requestPermission === 'function') {
        const result = await eventClass.requestPermission();
        if (result !== 'granted') {
          throw new Error(`Sensor permission denied (${result})`);
        }
      }
    }
  }
}
