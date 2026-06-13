/* ──────────────────────────────────────────────────────────────
   IN.DI.GIT.AL. — static site + contact-form email backend.

   Serves the portfolio (index.html, css/, js/, assets) AND a single
   POST /api/contact endpoint that emails the form contents to you.

   Email goes out over Resend's HTTPS API (port 443) instead of SMTP,
   because Render's free tier blocks all outbound SMTP ports (25/465/587).
   No SMTP, no extra npm deps — just the built-in fetch.

   Required env vars (set locally in .env, or in the Render dashboard):
     RESEND_API_KEY   API key from https://resend.com/api-keys (starts re_…)
     CONTACT_TO       where messages land — on Resend's free tier this MUST
                      be the email you signed up to Resend with
   Optional:
     MAIL_FROM        the From address. Defaults to onboarding@resend.dev
                      (Resend's shared sender, allowed without a domain).
                      Once you verify your own domain, set e.g.
                      "IN.DI.GIT.AL. <hello@yourdomain.com>".
     PORT             injected by Render; defaults to 3000 locally
─────────────────────────────────────────────────────────────── */

require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

const { RESEND_API_KEY, CONTACT_TO } = process.env;
const MAIL_FROM = process.env.MAIL_FROM || 'IN.DI.GIT.AL. <onboarding@resend.dev>';

// If creds are missing we still boot (so the static site works), but
// /api/contact returns 503 until they're set.
const mailReady = Boolean(RESEND_API_KEY && CONTACT_TO);

if (!mailReady) {
  console.warn('[contact] RESEND_API_KEY / CONTACT_TO not set — /api/contact will return 503 until they are.');
} else {
  // Probe the API key at boot so the logs show immediately whether it's valid,
  // rather than only finding out on the first real submission.
  fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  })
    .then((r) => {
      if (r.ok) console.log('[contact] Resend ready — API key accepted.');
      else console.error(`[contact] Resend key check FAILED: HTTP ${r.status} (key invalid?).`);
    })
    .catch((err) => console.error('[contact] Resend key check error:', err.message));
}

// Send one email via Resend's REST API, with a hard timeout so the request
// can never hang (the old SMTP path stalled ~2 min — this aborts at 15s).
async function sendViaResend({ replyTo, subject, text, html }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [CONTACT_TO],
        reply_to: replyTo,   // hitting "reply" answers the visitor
        subject,
        text,
        html,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Resend returns { name, message } on error — surface the real reason.
      throw new Error(`HTTP ${res.status} ${data.name || ''} ${data.message || ''}`.trim());
    }
    return data; // { id: '…' }
  } finally {
    clearTimeout(timeout);
  }
}

app.use(express.json({ limit: '16kb' }));

// Basic abuse guard: at most 5 submissions per 10 min per IP.
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many messages — please try again later.' },
});

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    if (!mailReady) {
      return res.status(503).json({ ok: false, error: 'Email is not configured yet.' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    const honeypot = String(req.body.company || '').trim(); // hidden field — bots fill it

    // Silently accept-and-drop obvious bots so they don't retry.
    if (honeypot) return res.json({ ok: true });

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Name, email, and message are required.' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    await sendViaResend({
      replyTo: `${name} <${email}>`,
      subject: subject ? `Portfolio · ${subject}` : `Portfolio message from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
      html: `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>
             <hr><p>— <strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>`,
    });

    return res.json({ ok: true });
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout (15s)' : err.message;
    console.error('[contact] send failed:', reason);
    return res.status(500).json({ ok: false, error: 'Could not send your message. Please try again.' });
  }
});

// Serve the static portfolio from the repo root.
app.use(express.static(__dirname, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`IN.DI.GIT.AL. running on http://localhost:${PORT}`);
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
