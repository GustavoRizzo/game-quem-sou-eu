// Zero-dependency HTTPS static file server for local development.
// HTTPS is required because motion sensor APIs only work in secure contexts.
// A self-signed certificate is generated on first run (requires openssl).

import { createServer } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentTypeFor, resolveSafePath } from './static-files.mjs';

const PORT = Number(process.env.PORT ?? 8443);
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CERT_DIR = join(ROOT, '.certs');
const CERT_FILE = join(CERT_DIR, 'cert.pem');
const KEY_FILE = join(CERT_DIR, 'key.pem');

function ensureCertificate() {
  if (existsSync(CERT_FILE) && existsSync(KEY_FILE)) return;
  mkdirSync(CERT_DIR, { recursive: true });
  console.log('Generating self-signed certificate in .certs/ ...');
  execSync(
    `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 ` +
      `-keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 365 -nodes ` +
      `-subj "/CN=quem-sou-eu-dev" ` +
      `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
    { stdio: 'inherit' }
  );
}

function localIps() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    const filePath = resolveSafePath(ROOT, pathname);
    if (filePath === null) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': 'no-store', // always fresh during development
    });
    res.end(body);
    console.log(`${res.statusCode} ${req.method} ${pathname}`);
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Internal Server Error');
  }
}

ensureCertificate();

const server = createServer(
  {
    cert: await readFile(CERT_FILE),
    key: await readFile(KEY_FILE),
  },
  handleRequest
);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\nDev server running (HTTPS, self-signed certificate):');
  console.log(`  PC:    https://localhost:${PORT}`);
  for (const ip of localIps()) {
    console.log(`  WSL:   https://${ip}:${PORT}`);
  }
  console.log(`  Phone: https://<WINDOWS-LAN-IP>:${PORT} (requires port-proxy, see docs/fase-1-teste-local.md)`);
  console.log('\nOn the phone, accept the certificate warning (Advanced > Proceed).\n');
});
