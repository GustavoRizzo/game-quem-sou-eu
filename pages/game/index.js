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
import { SettingsRepository, sensitivityTriggerAngle } from '../../lib/settings-repository.js';
import { beep, vibrate, flash } from '../../lib/feedback.js';
import { track } from '../../lib/analytics.js';
import '../../lib/value-gauge.js'; // registers the <value-gauge> element

// --- Load user settings ---
const settings = SettingsRepository.load();
const GAME_DURATION_MS = settings.durationSeconds * 1000;
const COUNTDOWN_SECONDS = 3;
const SELECTED_MODE = settings.categories;
const WORD_LISTS_BASE = '../../assets/word-lists/';

const config = { ...DEFAULT_CONFIG, triggerAngle: sensitivityTriggerAngle(settings.sensitivity) };
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

// --- Immersive mode: fullscreen + landscape lock + screen wake lock ---
// The phone is held sideways on the forehead, so during a match we lock to
// landscape (which on Android requires fullscreen) and keep the screen awake.
// Everything is best-effort: a missing or denied API must never break the
// game. These run from the "Começar" user gesture, which fullscreen and
// orientation lock require, and are released when the match ends.
let wakeLock = null;

async function acquireWakeLock() {
  try {
    wakeLock = (await navigator.wakeLock?.request?.('screen')) ?? null;
  } catch {
    wakeLock = null; // wake lock optional
  }
}

async function enterImmersive() {
  try {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    /* fullscreen optional */
  }
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* orientation lock optional (e.g. desktop, or no fullscreen) */
  }
  await acquireWakeLock();
}

async function exitImmersive() {
  try {
    await wakeLock?.release?.();
  } catch {
    /* ignore */
  }
  wakeLock = null;
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* ignore */
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

// The OS drops the wake lock whenever the tab is hidden; re-acquire it on
// return if a match is still going.
document.addEventListener('visibilitychange', () => {
  const playing = state === 'countdown' || state === 'playing';
  if (document.visibilityState === 'visible' && playing && (!wakeLock || wakeLock.released)) {
    acquireWakeLock();
  }
});

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

  await enterImmersive(); // fullscreen + landscape + wake lock (uses this gesture)

  try {
    await sensors.start();
  } catch (err) {
    await exitImmersive();
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
    await exitImmersive();
    setStatus(`Não foi possível carregar as palavras: ${err.message}`, false);
    return;
  }

  if (pendingDeck.length === 0) {
    sensors.stop();
    await exitImmersive();
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
  track('game_start', {
    duration: settings.durationSeconds,
    sensitivity: settings.sensitivity,
    categories: SELECTED_MODE.join(','),
  });
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
  exitImmersive(); // back to portrait, release wake lock
  const record = match.toRecord(Date.now());
  try {
    repo.save(record);
  } catch {
    /* persistence is best-effort; never block showing the result */
  }
  const summary = summarize(record);
  track('game_finish', {
    hits: summary.hits,
    shown: summary.shown,
    accuracy: Math.round(summary.accuracy * 100),
  });
  renderResults(record, summary);
  showScreen('results');
}

function renderResults(record, s) {
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

el('setup-duration').textContent = settings.durationSeconds;
el('setup-categories').textContent = SELECTED_MODE
  .map((id) => categoryById(id)?.name ?? id)
  .join(', ') || '—';

el('btn-start').addEventListener('click', startGame);
el('btn-again').addEventListener('click', () => {
  track('play_again');
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
