// <value-gauge> — a reusable linear gauge as a native Web Component.
// Encapsulates its HTML and CSS in a Shadow DOM; delegates all positioning
// math to the pure lib/gauge-geometry.js.
//
// Usage:
//   <value-gauge min="0" max="180"></value-gauge>
//   const g = document.querySelector('value-gauge');
//   g.value = 90;                                   // needle position
//   g.zone = [30, 150];                             // highlighted band
//   g.markers = [{ value: 55, color: 'lime' }, ...] // vertical marks
//
// Theming from outside the shadow boundary (custom properties inherit through):
//   --gauge-track-color, --gauge-zone-color, --gauge-needle-color

import { valueToPercent, bandToPercent } from './gauge-geometry.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
  <style>
    :host { display: block; }
    .track {
      position: relative;
      height: 22px;
      border-radius: 11px;
      background: var(--gauge-track-color, rgba(255, 255, 255, 0.08));
      overflow: hidden;
    }
    .zone {
      position: absolute;
      top: 0;
      bottom: 0;
      background: var(--gauge-zone-color, rgba(78, 204, 163, 0.30));
    }
    .marker {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-1px);
      background: rgba(255, 255, 255, 0.5);
    }
    .needle {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 4px;
      border-radius: 2px;
      background: var(--gauge-needle-color, #eaeaea);
      transform: translateX(-2px);
      transition: left 0.05s linear;
    }
  </style>
  <div class="track" part="track">
    <div class="zone" part="zone" hidden></div>
    <div class="needle" part="needle"></div>
  </div>
`;

export class ValueGauge extends HTMLElement {
  static observedAttributes = ['min', 'max'];

  #value = 0;
  #zone = null;
  #markers = [];
  #track;
  #zoneEl;
  #needle;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(TEMPLATE.content.cloneNode(true));
    this.#track = this.shadowRoot.querySelector('.track');
    this.#zoneEl = this.shadowRoot.querySelector('.zone');
    this.#needle = this.shadowRoot.querySelector('.needle');
  }

  get min() { return Number(this.getAttribute('min') ?? 0); }
  get max() { return Number(this.getAttribute('max') ?? 100); }

  set value(v) { this.#value = v; this.#renderNeedle(); }
  get value() { return this.#value; }

  set zone(range) { this.#zone = range; this.#renderZone(); }
  get zone() { return this.#zone; }

  set markers(list) { this.#markers = list ?? []; this.#renderMarkers(); }
  get markers() { return this.#markers; }

  connectedCallback() { this.#renderAll(); }
  attributeChangedCallback() { this.#renderAll(); }

  #renderAll() {
    this.#renderZone();
    this.#renderMarkers();
    this.#renderNeedle();
  }

  #renderNeedle() {
    this.#needle.style.left = `${valueToPercent(this.#value, this.min, this.max)}%`;
  }

  #renderZone() {
    if (!this.#zone) {
      this.#zoneEl.hidden = true;
      return;
    }
    const { left, width } = bandToPercent(this.#zone[0], this.#zone[1], this.min, this.max);
    this.#zoneEl.style.left = `${left}%`;
    this.#zoneEl.style.width = `${width}%`;
    this.#zoneEl.hidden = false;
  }

  #renderMarkers() {
    this.#track.querySelectorAll('.marker').forEach((m) => m.remove());
    for (const { value, color } of this.#markers) {
      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.style.left = `${valueToPercent(value, this.min, this.max)}%`;
      if (color) marker.style.background = color;
      this.#track.insertBefore(marker, this.#needle);
    }
  }
}

customElements.define('value-gauge', ValueGauge);
