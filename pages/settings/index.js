import { CATEGORIES } from '../../lib/categories.js';
import {
  SettingsRepository,
  defaultSettings,
  SENSITIVITY_OPTIONS,
} from '../../lib/settings-repository.js';

const DURATION_OPTIONS = [30, 60, 90, 120];

let settings = SettingsRepository.load();

// --- Render helpers ---

function renderDuration() {
  const container = document.getElementById('duration-options');
  container.innerHTML = DURATION_OPTIONS.map(
    (s) => `<label class="pill-option">
      <input type="radio" name="duration" value="${s}" ${settings.durationSeconds === s ? 'checked' : ''}>
      ${s}s
    </label>`
  ).join('');
}

function renderCategories() {
  const container = document.getElementById('category-list');
  container.innerHTML = CATEGORIES.map(
    (cat) => `<label class="toggle-row">
      <span>${cat.name}</span>
      <input type="checkbox" name="category" value="${cat.id}" ${settings.categories.includes(cat.id) ? 'checked' : ''}>
    </label>`
  ).join('');
}

function renderSensitivity() {
  const container = document.getElementById('sensitivity-options');
  container.innerHTML = SENSITIVITY_OPTIONS.map(
    (opt) => `<label class="pill-option" title="${opt.description}">
      <input type="radio" name="sensitivity" value="${opt.value}" ${settings.sensitivity === opt.value ? 'checked' : ''}>
      ${opt.label}
    </label>`
  ).join('');
}

function render() {
  renderDuration();
  renderCategories();
  renderSensitivity();
}

function readForm() {
  const duration = Number(
    document.querySelector('input[name="duration"]:checked')?.value ?? 60
  );
  const categories = [...document.querySelectorAll('input[name="category"]:checked')].map(
    (el) => el.value
  );
  const sensitivity =
    document.querySelector('input[name="sensitivity"]:checked')?.value ?? 'normal';
  return { durationSeconds: duration, categories, sensitivity };
}

// --- Events ---

document.getElementById('btn-all').addEventListener('click', () => {
  document.querySelectorAll('input[name="category"]').forEach((el) => (el.checked = true));
});

document.getElementById('btn-none').addEventListener('click', () => {
  document.querySelectorAll('input[name="category"]').forEach((el) => (el.checked = false));
});

document.getElementById('btn-save').addEventListener('click', () => {
  const data = readForm();
  if (data.categories.length === 0) {
    alert('Selecione ao menos uma lista de palavras.');
    return;
  }
  SettingsRepository.save(data);
  const btn = document.getElementById('btn-save');
  const prev = btn.textContent;
  btn.textContent = 'Salvo ✓';
  setTimeout(() => (btn.textContent = prev), 1500);
});

document.getElementById('btn-reset').addEventListener('click', () => {
  SettingsRepository.reset();
  settings = defaultSettings();
  render();
});

render();
