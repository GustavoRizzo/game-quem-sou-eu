// Unit tests for lib/settings-repository.js using an in-memory storage stub
// (no jsdom, no real localStorage), mirroring the project's testing approach.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SettingsStore,
  defaultSettings,
  sensitivityTriggerAngle,
  SENSITIVITY_OPTIONS,
} from '../lib/settings-repository.js';

// Minimal Web Storage stub: just the three methods the store uses.
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test('load returns the defaults on a fresh store', () => {
  const store = new SettingsStore(memoryStorage());
  assert.deepEqual(store.load(), defaultSettings());
});

test('save then load round-trips the settings', () => {
  const store = new SettingsStore(memoryStorage());
  const saved = { durationSeconds: 90, categories: ['animais'], sensitivity: 'high' };
  store.save(saved);
  assert.deepEqual(store.load(), saved);
});

test('load fills in fields missing from a saved blob with current defaults', () => {
  const storage = memoryStorage();
  storage.setItem('quem-sou-eu:settings', JSON.stringify({ durationSeconds: 30 }));
  const store = new SettingsStore(storage);
  const loaded = store.load();
  assert.equal(loaded.durationSeconds, 30);
  assert.deepEqual(loaded.categories, defaultSettings().categories);
  assert.equal(loaded.sensitivity, 'normal');
});

test('corrupt storage is treated as the defaults, not an error', () => {
  const storage = memoryStorage();
  storage.setItem('quem-sou-eu:settings', '{not valid json');
  const store = new SettingsStore(storage);
  assert.deepEqual(store.load(), defaultSettings());
});

test('reset removes the saved settings, falling back to defaults', () => {
  const storage = memoryStorage();
  const store = new SettingsStore(storage);
  store.save({ durationSeconds: 30, categories: [], sensitivity: 'low' });
  store.reset();
  assert.deepEqual(store.load(), defaultSettings());
});

test('sensitivityTriggerAngle resolves every known option, and falls back to normal for an unknown value', () => {
  for (const opt of SENSITIVITY_OPTIONS) {
    assert.equal(sensitivityTriggerAngle(opt.value), opt.triggerAngle);
  }
  assert.equal(sensitivityTriggerAngle('bogus'), sensitivityTriggerAngle('normal'));
});
