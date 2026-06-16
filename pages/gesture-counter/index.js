// Gesture counter test page: wires the motion sensors to the pure gesture
// detector and shows live counters + feedback. Also serves as a calibration
// tool: a live gauge (needle) shows gamma against the valid-position zone and
// the neutral, tunable thresholds, and an invert button.

import { MotionSensors, isMotionSupported } from '../../lib/motion-sensors.js';
import { DEFAULT_CONFIG } from '../../lib/game-config.js';
import { GestureDetector, GestureEvent } from '../../lib/gesture-detector.js';
import { foreheadTilt } from '../../lib/forehead-tilt.js';
import { beep as playBeep, vibrate as playVibrate, flash as playFlash } from '../../lib/feedback.js';
import '../../lib/value-gauge.js'; // registers the <value-gauge> element

// Live, mutable copy of the defaults; sliders edit it in place and the detector
// reads it by reference, so changes take effect immediately.
const config = { ...DEFAULT_CONFIG };

const el = (id) => document.getElementById(id);
const gammaEl = el('gamma');
const tiltEl = el('tilt');
const statusEl = el('status');
const scoreEl = el('score');
const hitsEl = el('hits');
const skipsEl = el('skips');
const logEl = el('log');
const toggleBtn = el('btn-toggle');
const positionCard = el('position-card');
const positionMsg = el('position-msg');
const gauge = el('gauge'); // <value-gauge>, works in forehead-tilt space (0..180)

let hits = 0;
let skips = 0;

// The zone and markers only change when the calibration sliders move, so they
// are set here (not every frame); the needle value is updated per sample.
function renderGaugeConfig() {
  const { neutralGamma: n, positionMaxDeviation: maxDev, triggerAngle: trig } = config;
  gauge.zone = [n - maxDev, n + maxDev];
  gauge.markers = [
    { value: n, color: 'rgba(255, 255, 255, 0.5)' }, // neutral
    { value: n - trig, color: 'var(--accent)' }, // cross here = hit
    { value: n + trig, color: 'var(--warn)' }, // cross here = skip
  ];
}

// --- Calibration sliders, generated from a descriptor ---
const SLIDERS = [
  { key: 'neutralGamma', label: 'Neutro (inclinação)', min: 0, max: 180, step: 1, unit: '°' },
  { key: 'triggerAngle', label: 'Limiar do gesto', min: 5, max: 80, step: 1, unit: '°' },
  { key: 'neutralBand', label: 'Zona neutra (re-arme)', min: 3, max: 40, step: 1, unit: '°' },
  { key: 'cooldownMs', label: 'Cooldown', min: 0, max: 2000, step: 50, unit: 'ms' },
  { key: 'positionMaxDeviation', label: 'Tolerância de posição', min: 20, max: 120, step: 1, unit: '°' },
  { key: 'positionDebounceMs', label: 'Debounce de posição', min: 300, max: 4000, step: 100, unit: 'ms' },
];

function buildSliders() {
  const container = el('sliders');
  for (const { key, label, min, max, step, unit } of SLIDERS) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    const value = document.createElement('span');
    value.className = 'slider-value';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = config[key];
    const render = () => { value.textContent = `${config[key]}${unit}`; };
    input.addEventListener('input', () => {
      config[key] = Number(input.value);
      render();
      renderGaugeConfig();
    });
    render();
    row.append(
      Object.assign(document.createElement('span'), { className: 'slider-label', textContent: label }),
      input,
      value
    );
    container.append(row);
  }
}

// --- Feedback ---
// Same effects as the game (lib/feedback.js), gated per-channel by this
// page's checkboxes so a tester can isolate sound/vibration/flash.
function beep(frequency) {
  if (el('fb-sound').checked) playBeep(frequency);
}

function vibrate(pattern) {
  if (el('fb-vibrate').checked) playVibrate(pattern);
}

function flash(kind) {
  if (el('fb-flash').checked) playFlash(kind);
}

function log(message) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  logEl.prepend(li);
  while (logEl.children.length > 12) logEl.lastChild.remove();
}

// --- Detector wiring ---
function onGestureEvent({ type }) {
  switch (type) {
    case GestureEvent.HIT:
      hits++;
      hitsEl.textContent = hits;
      updateScore();
      flash('hit');
      beep(880);
      vibrate(80);
      log('✅ Acerto (+1)');
      break;
    case GestureEvent.SKIP:
      skips++;
      skipsEl.textContent = skips;
      updateScore();
      flash('skip');
      beep(280);
      vibrate([40, 40, 40]);
      log('⏭️ Skip (−1)');
      break;
    case GestureEvent.REPOSITION:
      log('📲 Fora de posição');
      break;
    case GestureEvent.POSITIONED:
      log('👍 Posicionado');
      break;
  }
}

const detector = new GestureDetector(config, onGestureEvent);

function updateScore() {
  scoreEl.textContent = hits - skips;
}

function setStatus(text, ok = true) {
  statusEl.textContent = text;
  statusEl.className = ok ? 'ok' : 'fail';
}

function updatePosition(tilt) {
  const inZone = Math.abs(tilt - config.neutralGamma) <= config.positionMaxDeviation;
  positionCard.classList.toggle('out', detector.outOfPosition);
  positionCard.classList.toggle('in', inZone && !detector.outOfPosition);
  gauge.style.setProperty('--gauge-needle-color', detector.outOfPosition ? 'var(--warn)' : 'var(--text)');
  if (detector.outOfPosition) {
    positionMsg.textContent = '📲 Fora de posição — leve a agulha para a faixa verde.';
  } else if (!inZone) {
    positionMsg.textContent = 'Aproximando… mova a agulha para a faixa verde.';
  } else if (detector.armed) {
    positionMsg.textContent = 'Na posição e armado ✓ — faça o gesto.';
  } else {
    positionMsg.textContent = 'Na posição — volte ao neutro para armar.';
  }
}

const sensors = new MotionSensors({
  onOrientation({ gamma }) {
    if (gamma === null || gamma === undefined) return;
    const tilt = foreheadTilt(gamma);
    gammaEl.textContent = gamma.toFixed(0);
    tiltEl.textContent = tilt.toFixed(0);
    gauge.value = tilt;
    detector.process(tilt, performance.now());
    updatePosition(tilt);
  },
});

// --- Controls ---
el('invert').addEventListener('change', (e) => {
  config.invertDirection = e.target.checked;
});

async function toggle() {
  if (sensors.running) {
    sensors.stop();
    toggleBtn.textContent = 'Iniciar';
    setStatus('Parado.');
    return;
  }
  try {
    await sensors.start();
    detector.reset();
    toggleBtn.textContent = 'Parar';
    setStatus('Lendo sensores — posicione o celular na testa.');
  } catch (err) {
    setStatus(`Erro ao iniciar: ${err.message}`, false);
  }
}

el('btn-reset').addEventListener('click', () => {
  hits = 0;
  skips = 0;
  hitsEl.textContent = '0';
  skipsEl.textContent = '0';
  updateScore();
  detector.reset();
  log('Placar zerado');
});

toggleBtn.addEventListener('click', toggle);

buildSliders();
renderGaugeConfig();
gauge.value = config.neutralGamma;

if (!isMotionSupported()) {
  setStatus(
    window.isSecureContext
      ? 'APIs de sensores indisponíveis neste navegador.'
      : 'Contexto inseguro (sem HTTPS) — sensores bloqueados.',
    false
  );
  toggleBtn.disabled = true;
}
