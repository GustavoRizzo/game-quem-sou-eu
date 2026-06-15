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

export const SettingsRepository = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings();
      return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch {
      return defaultSettings();
    }
  },

  save(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
