const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimit = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const ip = getClientIp(req);
  if (exceedsRateLimit(ip)) {
    res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
    return;
  }

  const validation = validateInquiry(req.body || {});

  if (validation.data.website) {
    res.status(400).json({ ok: false, error: 'Invalid request.' });
    return;
  }

  if (!validation.ok) {
    res.status(400).json({ ok: false, error: 'Validation failed.', details: validation.errors });
    return;
  }

  const id = `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Vercel serverless is ephemeral. Persist to external DB in production if required.
  console.log('[contact-inquiry]', {
    id,
    submittedAt: new Date().toISOString(),
    ip,
    userAgent: req.headers['user-agent'] || '',
    ...validation.data
  });

  res.status(200).json({ ok: true, id });
};
