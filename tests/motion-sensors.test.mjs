// Unit tests for lib/motion-sensors.js.
// The module reads the global `window` at call time, so each test
// installs a stub window before exercising the API.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { MotionSensors, isMotionSupported } from '../lib/motion-sensors.js';

function makeWindow({ secure = true, withApis = true } = {}) {
  const listeners = new Map();
  const win = {
    isSecureContext: secure,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    listeners,
  };
  if (withApis) {
    win.DeviceOrientationEvent = class {};
    win.DeviceMotionEvent = class {};
  }
  return win;
}

beforeEach(() => {
  globalThis.window = makeWindow();
});

test('isMotionSupported is true with secure context and both APIs', () => {
  assert.equal(isMotionSupported(), true);
});

test('isMotionSupported is false without secure context', () => {
  globalThis.window = makeWindow({ secure: false });
  assert.equal(isMotionSupported(), false);
});

test('isMotionSupported is false without the sensor APIs', () => {
  globalThis.window = makeWindow({ withApis: false });
  assert.equal(isMotionSupported(), false);
});

test('start registers listeners and running reflects the state', async () => {
  const sensors = new MotionSensors();
  assert.equal(sensors.running, false);

  await sensors.start();
  assert.equal(sensors.running, true);
  assert.ok(window.listeners.has('deviceorientation'));
  assert.ok(window.listeners.has('devicemotion'));

  sensors.stop();
  assert.equal(sensors.running, false);
  assert.equal(window.listeners.size, 0);
});

test('orientation events reach the callback with mapped fields', async () => {
  const received = [];
  const sensors = new MotionSensors({ onOrientation: (data) => received.push(data) });
  await sensors.start();

  window.listeners.get('deviceorientation')({
    alpha: 10,
    beta: 20,
    gamma: 30,
    absolute: true,
    extraneous: 'ignored',
  });

  assert.deepEqual(received, [{ alpha: 10, beta: 20, gamma: 30, absolute: true }]);
});

test('motion events reach the callback with mapped fields', async () => {
  const received = [];
  const sensors = new MotionSensors({ onMotion: (data) => received.push(data) });
  await sensors.start();

  const rotationRate = { alpha: 1, beta: 2, gamma: 3 };
  const acceleration = { x: 0.1, y: 0.2, z: 0.3 };
  window.listeners.get('devicemotion')({
    acceleration,
    accelerationIncludingGravity: acceleration,
    rotationRate,
    interval: 16,
  });

  assert.equal(received.length, 1);
  assert.deepEqual(received[0].rotationRate, rotationRate);
  assert.deepEqual(received[0].acceleration, acceleration);
  assert.equal(received[0].interval, 16);
});

test('start asks for permission when the platform requires it (iOS)', async () => {
  let asked = 0;
  window.DeviceOrientationEvent = class {
    static async requestPermission() {
      asked++;
      return 'granted';
    }
  };

  const sensors = new MotionSensors();
  await sensors.start();
  assert.equal(asked, 1);
  assert.equal(sensors.running, true);
});

test('start throws and stays stopped when permission is denied', async () => {
  window.DeviceOrientationEvent = class {
    static async requestPermission() {
      return 'denied';
    }
  };

  const sensors = new MotionSensors();
  await assert.rejects(() => sensors.start(), /denied/);
  assert.equal(sensors.running, false);
  assert.equal(window.listeners.size, 0);
});

test('start twice does not duplicate listeners', async () => {
  const sensors = new MotionSensors();
  await sensors.start();
  await sensors.start();
  assert.equal(window.listeners.size, 2);
  sensors.stop();
  assert.equal(window.listeners.size, 0);
});
