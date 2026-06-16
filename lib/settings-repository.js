// Persistence for player-chosen game settings (duration, categories, gesture
// sensitivity). Same injectable-storage pattern as lib/match-repository.js: a
// class wraps the Web Storage backend (defaulting to globalThis.localStorage)
// so it is unit-testable with a plain in-memory stub, and the module still
// imports cleanly in Node, where there is no localStorage.

import { CATEGORIES } from './categories.js';

const STORAGE_KEY = 'quem-sou-eu:settings';

export const SENSITIVITY_OPTIONS = [
  { value: 'low',    label: 'Baixa',  description: 'inclinar bastante', triggerAngle: 45 },
  { value: 'normal', label: 'Normal', description: 'inclinação média',  triggerAngle: 35 },
  { value: 'high',   label: 'Alta',   description: 'inclinar pouco',    triggerAngle: 22 },
];

export function defaultSettings() {
  return {
    durationSeconds: 60,
    categories: CATEGORIES.map((c) => c.id),
    sensitivity: 'normal',
  };
}

export function sensitivityTriggerAngle(sensitivity) {
  return SENSITIVITY_OPTIONS.find((o) => o.value === sensitivity)?.triggerAngle ?? 35;
}

export class SettingsStore {
  #storage;
  #key;

  constructor(storage = globalThis.localStorage, key = STORAGE_KEY) {
    this.#storage = storage;
    this.#key = key;
  }

  // Tolerates missing/corrupt data by returning the defaults.
  load() {
    try {
      const raw = this.#storage.getItem(this.#key);
      if (!raw) return defaultSettings();
      return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch {
      return defaultSettings();
    }
  }

  save(settings) {
    this.#storage.setItem(this.#key, JSON.stringify(settings));
  }

  reset() {
    this.#storage.removeItem(this.#key);
  }
}

export const SettingsRepository = new SettingsStore();
