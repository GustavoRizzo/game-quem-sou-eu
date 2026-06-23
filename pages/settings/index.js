import { listCategories } from '../../lib/categories.js';
import {
  SettingsRepository,
  defaultSettings,
  SENSITIVITY_OPTIONS,
} from '../../lib/settings-repository.js';
import { track } from '../../lib/analytics.js';

const DURATION_OPTIONS = [30, 60, 90, 120];

// Custom list names are arbitrary user input; escape before interpolating into
// HTML so a name can never break the markup.
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

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

// Pencil icon (inline SVG, matching the project's no-Font-Awesome convention)
// linking to the word-list editor for that specific list.
const PENCIL_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';

function categoryRow(cat) {
  const inputId = `cat-${cat.id}`;
  const name = escapeHtml(cat.name);
  const checked = settings.categories.includes(cat.id) ? 'checked' : '';
  return `<div class="toggle-row">
      <label class="cat-name" for="${inputId}">${name}</label>
      <div class="cat-controls">
        <a class="cat-edit" href="../word-lists/?id=${encodeURIComponent(cat.id)}" aria-label="Editar a lista ${name}">${PENCIL_SVG}</a>
        <input type="checkbox" id="${inputId}" name="category" value="${cat.id}" ${checked}>
      </div>
    </div>`;
}

function categoryGroup(title, cats) {
  if (cats.length === 0) return '';
  return `<p class="group-label">${title}</p>` + cats.map(categoryRow).join('');
}

function renderCategories() {
  const container = document.getElementById('category-list');
  const cats = listCategories();
  container.innerHTML =
    categoryGroup('Listas do jogo', cats.filter((c) => !c.custom)) +
    categoryGroup('Minhas listas', cats.filter((c) => c.custom));
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
  track('settings_saved', {
    duration: data.durationSeconds,
    sensitivity: data.sensitivity,
    categories_count: data.categories.length,
  });
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
