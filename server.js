const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');
const querystring = require('node:querystring');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.ndjson');
const MAX_BODY_BYTES = 1024 * 64;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const rateLimit = new Map();

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'"
    ].join('; ')
  );
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function cleanRateLimit() {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimit.entries()) {
    const fresh = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) {
      rateLimit.delete(ip);
    } else {
      rateLimit.set(ip, fresh);
    }
  }
}

function exceedsRateLimit(ip) {
  cleanRateLimit();
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];
  const fresh = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimit.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  rateLimit.set(ip, fresh);
  return false;
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      const contentType = (req.headers['content-type'] || '').toLowerCase();

      if (!raw) {
        resolve({});
        return;
      }

      try {
        if (contentType.includes('application/json')) {
          resolve(JSON.parse(raw));
          return;
        }

        if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(querystring.parse(raw));
          return;
        }

        resolve({ raw });
      } catch (error) {
        reject(new Error('Invalid request body'));
      }
    });

    req.on('error', (error) => reject(error));
  });
}

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function validateInquiry(payload) {
  const name = sanitizeText(payload.name, 80);
  const organization = sanitizeText(payload.organization, 120);
  const email = sanitizeText(payload.email, 120).toLowerCase();
  const inquiryType = sanitizeText(payload.inquiryType, 80);
  const message = String(payload.message || '').trim().slice(0, 2000);
  const privacyConsent = payload.privacyConsent === true || payload.privacyConsent === 'true' || payload.privacyConsent === 'on';
  const website = sanitizeText(payload.website, 120);

  const errors = [];

  if (!name) errors.push('name is required');
  if (!organization) errors.push('organization is required');
  if (!email || !/^[-._+a-z0-9]+@[-.a-z0-9]+\.[a-z]{2,}$/i.test(email)) errors.push('valid email is required');
  if (!inquiryType) errors.push('inquiryType is required');
  if (!message || message.length < 20) errors.push('message must be at least 20 characters');
  if (!privacyConsent) errors.push('privacyConsent is required');

  return {
    ok: errors.length === 0,
    errors,
    data: {
      name,
      organization,
      email,
      inquiryType,
      message,
      privacyConsent,
      website
    }
  };
}

async function handleContact(req, res) {
  const ip = getClientIp(req);

  if (exceedsRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Too many requests. Please try again later.' }));
    return;
  }

  try {
    const payload = await parseRequestBody(req);
    const validation = validateInquiry(payload);

    if (validation.data.website) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid request.' }));
      return;
    }

    if (!validation.ok) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Validation failed.', details: validation.errors }));
      return;
    }

    await ensureDataDir();

    const id = `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      submittedAt: new Date().toISOString(),
      ip,
      userAgent: req.headers['user-agent'] || '',
      ...validation.data
    };

    await fsp.appendFile(INQUIRIES_FILE, `${JSON.stringify(record)}\n`, 'utf-8');

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, id }));
  } catch (error) {
    const status = error.message === 'Payload too large' ? 413 : 400;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
}

function resolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const safePath = path.normalize(decoded).replace(/^\.+/u, '');
  const candidate = path.join(PUBLIC_DIR, safePath);

  if (!candidate.startsWith(PUBLIC_DIR)) return null;

  const tryPaths = [];

  if (safePath === '/' || safePath === path.sep || safePath === '') {
    tryPaths.push(path.join(PUBLIC_DIR, 'index.html'));
  } else {
    tryPaths.push(candidate);
    tryPaths.push(`${candidate}.html`);
    tryPaths.push(path.join(candidate, 'index.html'));
    if (candidate.endsWith(path.sep)) {
      tryPaths.push(path.join(candidate, 'index.html'));
    }
  }

  for (const fullPath of tryPaths) {
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isFile() && fullPath.startsWith(PUBLIC_DIR)) {
        return fullPath;
      }
    } catch {
      // no-op
    }
  }

  return null;
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function serveNotFound(res) {
  const fallback404 = path.join(PUBLIC_DIR, '404.html');
  if (fs.existsSync(fallback404)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(fallback404).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && url.pathname === '/api/contact') {
    await handleContact(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveStaticPath(url.pathname);

  if (!filePath) {
    serveNotFound(res);
    return;
  }

  if (req.method === 'HEAD') {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end();
    return;
  }

  serveFile(filePath, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Ranchu Japan site running on http://${HOST}:${PORT}`);
});
