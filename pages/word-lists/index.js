// The word-lists manager page. Two views in one page, chosen by the URL:
//   - no query string  -> index of every list (built-in + custom)
//   - ?id=<categoryId> -> editor for that one list
// Using real URLs (not in-page state) keeps the browser Back button working.
//
// This file owns only the browser/DOM concerns; the data model and persistence
// live in the tested lib modules (categories.js + word-lists-repository.js).

import { listCategories, findCategory, loadEditableWords } from '../../lib/categories.js';
import { WordListsRepository, isCustomId } from '../../lib/word-lists-repository.js';
import {
  SettingsRepository,
} from '../../lib/settings-repository.js';

const BASE = '../../assets/word-lists/';
const repo = WordListsRepository;

const el = (id) => document.getElementById(id);

const editId = new URLSearchParams(location.search).get('id');
if (editId) {
  renderEditor(editId);
} else {
  renderIndex();
}

// --- Index view ------------------------------------------------------------

async function renderIndex() {
  el('view-index').hidden = false;
  el('page-sub').textContent = 'Ative ou desative palavras e crie suas próprias listas.';

  const categories = listCategories(repo);
  const container = el('lists');
  container.textContent = '';

  // Active/total counts give quick feedback on what was edited. Built-in lists
  // need their JSON fetched to count; custom lists come straight from storage.
  const counts = await Promise.all(
    categories.map((cat) => loadEditableWords(cat, { basePath: BASE, repo }))
  );

  categories.forEach((cat, i) => {
    const words = counts[i];
    const active = words.filter((w) => w.active).length;

    const row = document.createElement('a');
    row.className = 'list-row';
    row.href = `?id=${encodeURIComponent(cat.id)}`;

    const left = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'list-name';
    name.textContent = cat.name;
    left.append(name);
    if (cat.custom) {
      const tag = document.createElement('span');
      tag.className = 'list-tag';
      tag.textContent = 'minha';
      left.append(tag);
    }

    const meta = document.createElement('span');
    meta.className = 'list-meta';
    meta.textContent = `${active}/${words.length} ›`;

    row.append(left, meta);
    container.append(row);
  });
}

el('btn-new').addEventListener('click', () => {
  const name = prompt('Nome da nova lista:');
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const list = repo.createList(trimmed);
  enablePlayingList(list.id); // a fresh list starts selected for the game
  location.href = `?id=${encodeURIComponent(list.id)}`;
});

// A brand-new custom list should be playable right away: add its id to the
// game's selected categories. Done explicitly here rather than guessing in the
// game so the settings stay the single source of truth for what plays.
function enablePlayingList(id) {
  const settings = SettingsRepository.load();
  if (!settings.categories.includes(id)) {
    settings.categories.push(id);
    SettingsRepository.save(settings);
  }
}

// --- Editor view -----------------------------------------------------------

async function renderEditor(id) {
  const category = findCategory(id, repo);
  if (!category) {
    location.href = '.'; // unknown id (e.g. deleted) -> back to the index
    return;
  }

  const custom = !!category.custom;
  el('view-editor').hidden = false;
  el('page-title').textContent = custom ? 'Editar lista' : category.name;
  el('page-sub').textContent = custom
    ? 'Adicione palavras e escolha quais entram no jogo.'
    : 'Desative as palavras que não quer ver no jogo.';
  el('editor-name').textContent = category.name;
  el('add-row').hidden = !custom;
  el('custom-actions').hidden = !custom;

  const words = await loadEditableWords(category, { basePath: BASE, repo });
  renderWords(id, custom, words);

  el('btn-all').addEventListener('click', () => setAll(id, custom, words, true));
  el('btn-none').addEventListener('click', () => setAll(id, custom, words, false));

  if (custom) wireCustomActions(id, category, words);
}

function renderWords(id, custom, words) {
  const container = el('words');
  container.textContent = '';

  if (words.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent = 'Nenhuma palavra ainda. Adicione a primeira acima.';
    container.append(hint);
    return;
  }

  for (const word of words) {
    container.append(wordRow(id, custom, word, words));
  }
}

function wordRow(id, custom, word, words) {
  const row = document.createElement('div');
  row.className = 'word-row' + (word.active ? '' : ' inactive');

  const text = document.createElement('span');
  text.className = 'word-text';
  text.textContent = word.text;
  row.append(text);

  const controls = document.createElement('div');
  controls.className = 'word-controls';

  if (custom) {
    const remove = document.createElement('button');
    remove.className = 'btn-remove';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remover ${word.text}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      repo.removeWord(id, word.text);
      const idx = words.indexOf(word);
      if (idx >= 0) words.splice(idx, 1);
      renderWords(id, custom, words);
    });
    controls.append(remove);
  }

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = word.active;
  toggle.setAttribute('aria-label', word.text);
  toggle.addEventListener('change', () => {
    word.active = toggle.checked;
    row.classList.toggle('inactive', !toggle.checked);
    if (custom) repo.toggleWord(id, word.text);
    else repo.setBuiltinWord(id, word.text, toggle.checked);
  });
  controls.append(toggle);

  row.append(controls);
  return row;
}

function setAll(id, custom, words, active) {
  words.forEach((w) => (w.active = active));
  if (custom) repo.setAllCustomWords(id, active);
  else repo.setAllBuiltinWords(id, words.map((w) => w.text), active);
  renderWords(id, custom, words);
}

function wireCustomActions(id, category, words) {
  const input = el('new-word');

  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    repo.addWord(id, text);
    const list = repo.customList(id);
    words.splice(0, words.length, ...list.words.map((w) => ({ ...w })));
    renderWords(id, true, words);
    input.value = '';
    input.focus();
  };

  el('btn-add').addEventListener('click', add);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  });

  el('btn-rename').addEventListener('click', () => {
    const name = prompt('Novo nome da lista:', category.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    repo.renameList(id, trimmed);
    category.name = trimmed;
    el('editor-name').textContent = trimmed;
  });

  el('btn-delete').addEventListener('click', () => {
    if (!confirm(`Excluir a lista "${category.name}"? Isso não pode ser desfeito.`)) return;
    repo.deleteList(id);
    location.href = '.';
  });
}
