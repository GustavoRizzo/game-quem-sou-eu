// Pure helpers for static file serving (kept separate from the HTTP
// server so they can be unit tested).

import { extname, join, normalize, sep } from 'node:path';

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

export function contentTypeFor(filePath) {
  return MIME_TYPES[extname(filePath)] ?? 'application/octet-stream';
}

// Maps a URL pathname to a file path inside `root`, or null when the
// pathname escapes the root (path traversal attempt).
// A trailing slash resolves to the directory's index.html.
export function resolveSafePath(root, pathname) {
  if (pathname.endsWith('/')) pathname += 'index.html';
  const base = root.endsWith(sep) ? root : root + sep;
  const filePath = normalize(join(root, pathname));
  return filePath.startsWith(base) ? filePath : null;
}
