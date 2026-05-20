const crypto = require('crypto');

// Simple in-memory captcha store (no DB/session required)
// NOTE: will reset on server restart.
const CAPTCHAS = new Map();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateCaptchaId() {
  return crypto.randomBytes(16).toString('hex');
}

function createMathCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1; // 1..10
  const b = Math.floor(Math.random() * 10) + 1;
  const answer = a + b;

  const captchaId = generateCaptchaId();
  const question = `${a} + ${b} = ?`;

  CAPTCHAS.set(captchaId, {
    answer,
    expiresAt: Date.now() + DEFAULT_TTL_MS,
  });

  return { captchaId, question };
}

function verifyCaptcha({ captchaId, answer }) {
  if (!captchaId) return { ok: false, reason: 'captchaId is required' };
  const rec = CAPTCHAS.get(captchaId);
  if (!rec) return { ok: false, reason: 'Captcha expired or not found' };
  if (Date.now() > rec.expiresAt) {
    CAPTCHAS.delete(captchaId);
    return { ok: false, reason: 'Captcha expired' };
  }

  const submitted = typeof answer === 'string' ? Number(answer.trim()) : Number(answer);
  if (!Number.isFinite(submitted)) {
    return { ok: false, reason: 'Invalid captcha answer' };
  }

  const ok = submitted === rec.answer;
  if (ok) {
    // one-time use
    CAPTCHAS.delete(captchaId);
  }
  return { ok, reason: ok ? undefined : 'Captcha answer incorrect' };
}

module.exports = {
  createMathCaptcha,
  verifyCaptcha,
};

