// Sensor test page logic: live readout of motion sensor values
// with min/max tracking (useful later to calibrate gesture thresholds).

import { MotionSensors, isMotionSupported } from '../../lib/motion-sensors.js';

class MetricRow {
  #curEl;
  #minEl;
  #maxEl;
  #min = Infinity;
  #max = -Infinity;

  constructor(tr) {
    this.#curEl = tr.querySelector('.cur');
    this.#minEl = tr.querySelector('.min');
    this.#maxEl = tr.querySelector('.max');
  }

  update(value) {
    if (value === null || value === undefined) {
      this.#curEl.textContent = 'n/d';
      return;
    }
    this.#min = Math.min(this.#min, value);
    this.#max = Math.max(this.#max, value);
    this.#curEl.textContent = value.toFixed(1);
    this.#minEl.textContent = this.#min.toFixed(1);
    this.#maxEl.textContent = this.#max.toFixed(1);
  }

  reset() {
    this.#min = Infinity;
    this.#max = -Infinity;
    this.#minEl.textContent = '–';
    this.#maxEl.textContent = '–';
  }
}

const rows = new Map(
  [...document.querySelectorAll('[data-metric]')].map((tr) => [
    tr.dataset.metric,
    new MetricRow(tr),
  ])
);

const statusEl = document.getElementById('status');
const ratesEl = document.getElementById('rates');
const toggleBtn = document.getElementById('btn-toggle');
const resetBtn = document.getElementById('btn-reset');

let orientationEvents = 0;
let motionEvents = 0;
let ratesTimer = null;

const sensors = new MotionSensors({
  onOrientation(data) {
    orientationEvents++;
    rows.get('ori-alpha').update(data.alpha);
    rows.get('ori-beta').update(data.beta);
    rows.get('ori-gamma').update(data.gamma);
  },
  onMotion(data) {
    motionEvents++;
    rows.get('rot-alpha').update(data.rotationRate?.alpha);
    rows.get('rot-beta').update(data.rotationRate?.beta);
    rows.get('rot-gamma').update(data.rotationRate?.gamma);
    rows.get('acc-x').update(data.acceleration?.x);
    rows.get('acc-y').update(data.acceleration?.y);
    rows.get('acc-z').update(data.acceleration?.z);
  },
});

function setStatus(text, ok = true) {
  statusEl.textContent = text;
  statusEl.className = ok ? 'ok' : 'fail';
}

async function toggle() {
  if (sensors.running) {
    sensors.stop();
    clearInterval(ratesTimer);
    toggleBtn.textContent = 'Iniciar';
    setStatus('Parado.');
    return;
  }
  try {
    await sensors.start();
    toggleBtn.textContent = 'Parar';
    setStatus('Lendo sensores… mexa o aparelho.');
    ratesTimer = setInterval(() => {
      ratesEl.textContent = `Eventos/s — orientação: ${orientationEvents}, movimento: ${motionEvents}`;
      orientationEvents = 0;
      motionEvents = 0;
    }, 1000);
  } catch (err) {
    setStatus(`Erro ao iniciar: ${err.message}`, false);
  }
}

toggleBtn.addEventListener('click', toggle);
resetBtn.addEventListener('click', () => rows.forEach((row) => row.reset()));

if (!isMotionSupported()) {
  setStatus(
    window.isSecureContext
      ? 'APIs de sensores indisponíveis neste navegador.'
      : 'Contexto inseguro (sem HTTPS) — sensores bloqueados.',
    false
  );
  toggleBtn.disabled = true;
}
