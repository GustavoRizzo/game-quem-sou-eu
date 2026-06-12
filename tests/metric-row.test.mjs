// Unit tests for pages/sensor-test/metric-row.js (min/max tracking).
// Uses a minimal fake <tr> so no DOM implementation is needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MetricRow } from '../pages/sensor-test/metric-row.js';

function makeRow() {
  const cells = {
    cur: { textContent: '–' },
    min: { textContent: '–' },
    max: { textContent: '–' },
  };
  const tr = { querySelector: (selector) => cells[selector.slice(1)] };
  return { row: new MetricRow(tr), cells };
}

test('first update sets current, min and max to the same value', () => {
  const { row, cells } = makeRow();
  row.update(12.34);
  assert.equal(cells.cur.textContent, '12.3');
  assert.equal(cells.min.textContent, '12.3');
  assert.equal(cells.max.textContent, '12.3');
});

test('min and max track extremes across updates', () => {
  const { row, cells } = makeRow();
  row.update(10);
  row.update(-5);
  row.update(3);
  assert.equal(cells.cur.textContent, '3.0');
  assert.equal(cells.min.textContent, '-5.0');
  assert.equal(cells.max.textContent, '10.0');
});

test('null/undefined values show n/d and do not affect min/max', () => {
  const { row, cells } = makeRow();
  row.update(7);
  row.update(null);
  assert.equal(cells.cur.textContent, 'n/d');
  assert.equal(cells.min.textContent, '7.0');
  assert.equal(cells.max.textContent, '7.0');

  row.update(undefined);
  assert.equal(cells.cur.textContent, 'n/d');
  assert.equal(cells.min.textContent, '7.0');
});

test('reset clears min/max and tracking starts over', () => {
  const { row, cells } = makeRow();
  row.update(100);
  row.reset();
  assert.equal(cells.min.textContent, '–');
  assert.equal(cells.max.textContent, '–');

  row.update(1);
  assert.equal(cells.min.textContent, '1.0');
  assert.equal(cells.max.textContent, '1.0');
});
