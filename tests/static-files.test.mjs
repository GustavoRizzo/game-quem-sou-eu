// Unit tests for scripts/static-files.mjs (dev server path/MIME helpers).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { contentTypeFor, resolveSafePath } from '../scripts/static-files.mjs';

const ROOT = '/srv/site';

test('resolves a plain file inside the root', () => {
  assert.equal(resolveSafePath(ROOT, '/index.html'), '/srv/site/index.html');
  assert.equal(
    resolveSafePath(ROOT, '/pages/sensor-test/index.js'),
    '/srv/site/pages/sensor-test/index.js'
  );
});

test('a trailing slash resolves to the directory index.html', () => {
  assert.equal(resolveSafePath(ROOT, '/'), '/srv/site/index.html');
  assert.equal(
    resolveSafePath(ROOT, '/pages/sensor-test/'),
    '/srv/site/pages/sensor-test/index.html'
  );
});

test('rejects path traversal attempts', () => {
  assert.equal(resolveSafePath(ROOT, '/../etc/passwd'), null);
  assert.equal(resolveSafePath(ROOT, '/../../etc/passwd'), null);
  assert.equal(resolveSafePath(ROOT, '/pages/../../outside'), null);
});

test('rejects sneaky prefix escapes (sibling folder with same prefix)', () => {
  // /srv/site-evil starts with /srv/site as a string, but is outside the root
  assert.equal(resolveSafePath(ROOT, '/../site-evil/secret'), null);
});

test('normalizes redundant segments that stay inside the root', () => {
  assert.equal(
    resolveSafePath(ROOT, '/pages/../assets/styles.css'),
    '/srv/site/assets/styles.css'
  );
});

test('maps known extensions to their MIME type', () => {
  assert.equal(contentTypeFor('/a/index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('/a/styles.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeFor('/a/app.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('/a/manifest.webmanifest'), 'application/manifest+json');
});

test('falls back to octet-stream for unknown extensions', () => {
  assert.equal(contentTypeFor('/a/file.xyz'), 'application/octet-stream');
  assert.equal(contentTypeFor('/a/no-extension'), 'application/octet-stream');
});
