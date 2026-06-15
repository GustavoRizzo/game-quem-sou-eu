// The game page: ties together the sensors, the pure gesture detector, the
// match state and the results persistence. This file owns the browser-only
// concerns — the clock, the screens and the feedback; the rules live in the
// tested lib/ modules (deck, match, match-stats, match-repository).
//
// Screens: setup -> countdown -> playing -> results. Gestures only count while
// "playing"; the countdown gives the player time to place the phone.

import { MotionSensors, isMotionSupported } from '../../lib/motion-sensors.js';
import { DEFAULT_CONFIG } from '../../lib/game-config.js';
import { GestureDetector, GestureEvent } from '../../lib/gesture-detector.js';
import { foreheadTilt } from '../../lib/forehead-tilt.js';
import { categoryById, loadCategoryWords } from '../../lib/categories.js';
import { buildDeck } from '../../lib/deck.js';
import { Match, Result } from '../../lib/match.js';
import { summarize } from '../../lib/match-stats.js';
import { MatchRepository } from '../../lib/match-repository.js';
import '../../lib/value-gauge.js'; // registers the <value-gauge> element

// --- Game rules (a future settings screen could override these) ---
const GAME_DURATION_MS = 60_000;
const COUNTDOWN_SECONDS = 3;
const SELECTED_MODE = ['animais']; // category ids; one fixed list for now
const WORD_LISTS_BASE = '../../assets/word-lists/';

const config = { ...DEFAULT_CONFIG };
const repo = new MatchRepository();
const el = (id) => document.getElementById(id);

const SCREENS = ['setup', 'countdown', 'playing', 'results'];
function showScreen(name) {
  for (const s of SCREENS) el(`screen-${s}`).hidden = s !== name;
}

// --- State ---
let state = 'setup'; // setup | countdown | playing | results
let match = null;
let pendingDeck = null;
let playStartMs = 0;
let timerId = null;
let countdownId = null;

// --- Feedback ---
let audioCtx = null;
function beep(frequency) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {
    /* audio is best-effort */
  }
}
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
function flash(kind) {
  const cls = `flash-${kind}`;
  document.body.classList.add(cls);
  setTimeout(() => document.body.classList.remove(cls), 250);
}

// --- Gesture handling ---
function onGestureEvent({ type }) {
  if (state !== 'playing') return;
  switch (type) {
    case GestureEvent.HIT:
      score(Result.HIT, 'hit', 880, 80);
      break;
    case GestureEvent.SKIP:
      score(Result.SKIP, 'skip', 280, [40, 40, 40]);
      break;
    case GestureEvent.REPOSITION:
      el('reposition').hidden = false;
      break;
    case GestureEvent.POSITIONED:
      el('reposition').hidden = true;
      break;
  }
}

function score(result, kind, freq, vib) {
  flash(kind);
  beep(freq);
  vibrate(vib);
  const next = match.resolve(result);
  el('play-hits').textContent = match.hits;
  if (next === null) {
    endMatch(); // deck exhausted
    return;
  }
  renderWord();
}

function renderWord() {
  el('word').textContent = match.current.word;
}

const detector = new GestureDetector(config, onGestureEvent);

// The reposition overlay carries a live position gauge so the player can see
// the tilt against the valid (green) zone and know how to adjust — the same
// idea as the calibration gauge on the gesture-counter page.
const gauge = el('gauge'); // <value-gauge>, in forehead-tilt space (0..180)
const tiltEl = el('tilt');
function configureGauge() {
  const { neutralGamma: n, positionMaxDeviation: maxDev, triggerAngle: trig } = config;
  gauge.zone = [n - maxDev, n + maxDev]; // valid-position band
  gauge.markers = [
    { value: n, color: 'rgba(255, 255, 255, 0.6)' }, // neutral
    { value: n - trig, color: 'var(--accent)' }, // hit side
    { value: n + trig, color: 'var(--warn)' }, // skip side
  ];
  gauge.value = n;
}

const sensors = new MotionSensors({
  onOrientation({ gamma }) {
    if (gamma === null || gamma === undefined) return;
    if (state !== 'playing') return;
    const tilt = foreheadTilt(gamma);
    gauge.value = tilt;
    tiltEl.textContent = tilt.toFixed(0);
    detector.process(tilt, performance.now());
  },
});

// --- Flow ---
async function startGame() {
  if (state === 'countdown' || state === 'playing') return;

  try {
    await sensors.start();
  } catch (err) {
    setStatus(`Não foi possível acessar os sensores: ${err.message}`, false);
    return;
  }

  try {
    const lists = await Promise.all(
      SELECTED_MODE.map(async (id) => ({
        id,
        words: await loadCategoryWords(categoryById(id), { basePath: WORD_LISTS_BASE }),
      }))
    );
    pendingDeck = buildDeck(lists);
  } catch (err) {
    sensors.stop();
    setStatus(`Não foi possível carregar as palavras: ${err.message}`, false);
    return;
  }

  if (pendingDeck.length === 0) {
    sensors.stop();
    setStatus('Nenhuma palavra disponível para jogar.', false);
    return;
  }

  runCountdown();
}

function runCountdown() {
  state = 'countdown';
  showScreen('countdown');
  let n = COUNTDOWN_SECONDS;
  const cd = el('countdown');
  cd.textContent = n;
  countdownId = setInterval(() => {
    n--;
    if (n > 0) cd.textContent = n;
    else if (n === 0) cd.textContent = 'Já!';
    else {
      clearInterval(countdownId);
      beginPlay();
    }
  }, 1000);
}

function beginPlay() {
  detector.reset();
  playStartMs = Date.now();
  match = new Match(pendingDeck, { mode: SELECTED_MODE, startedAt: playStartMs });
  el('play-hits').textContent = '0';
  el('reposition').hidden = true;
  renderWord();
  showScreen('playing');
  state = 'playing';
  timerId = setInterval(tick, 200);
  tick();
}

function tick() {
  const remaining = GAME_DURATION_MS - (Date.now() - playStartMs);
  if (remaining <= 0) {
    el('timer').textContent = '0';
    endMatch(); // time is up
    return;
  }
  el('timer').textContent = Math.ceil(remaining / 1000);
}

function endMatch() {
  if (state !== 'playing') return;
  state = 'results';
  clearInterval(timerId);
  sensors.stop();
  const record = match.toRecord(Date.now());
  try {
    repo.save(record);
  } catch {
    /* persistence is best-effort; never block showing the result */
  }
  renderResults(record);
  showScreen('results');
}

function renderResults(record) {
  const s = summarize(record);
  el('res-hits').textContent = s.hits;
  el('res-shown').textContent = s.shown;
  el('res-accuracy').textContent = `${Math.round(s.accuracy * 100)}%`;
  el('res-hps').textContent = s.hitsPerSecond.toFixed(2);

  const list = el('res-words');
  list.replaceChildren();
  for (const entry of record.entries) {
    const li = document.createElement('li');
    li.className = entry.result === Result.HIT ? 'result-hit' : 'result-skip';
    li.textContent = entry.word;
    list.append(li);
  }
}

function setStatus(text, ok = true) {
  const s = el('status');
  s.textContent = text;
  s.className = ok ? 'muted' : 'fail';
}

// --- Wiring ---
configureGauge();
el('btn-start').addEventListener('click', startGame);
el('btn-again').addEventListener('click', () => {
  showScreen('setup');
  startGame();
});

if (!isMotionSupported()) {
  setStatus(
    window.isSecureContext
      ? 'APIs de sensores indisponíveis neste navegador.'
      : 'Contexto inseguro (sem HTTPS) — sensores bloqueados.',
    false
  );
  el('btn-start').disabled = true;
}
