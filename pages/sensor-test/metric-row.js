// Tracks and renders current/min/max values for one sensor table row.
// Kept in its own module so the tracking behaviour can be unit tested.

export class MetricRow {
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
