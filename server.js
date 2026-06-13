/* ──────────────────────────────────────────────────────────────
   IN.DI.GIT.AL. — static site + contact-form email backend.

   Serves the portfolio (index.html, css/, js/, assets) AND a single
   POST /api/contact endpoint that emails the form contents to you via
   Gmail SMTP (Nodemailer). Credentials come from environment variables;
   nothing secret lives in this file or the repo.

   Required env vars (set locally in .env, or in the Render dashboard):
     GMAIL_USER          your Gmail address (the SMTP login + From)
     GMAIL_APP_PASSWORD  a 16-char Google App Password (NOT your login pw)
     CONTACT_TO          where messages should land (usually your Gmail)
   Optional:
     PORT                injected by Render; defaults to 3000 locally
─────────────────────────────────────────────────────────────── */

require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO } = process.env;

// One reusable transport. If creds are missing we still boot (so the static
// site works), but /api/contact will report it's not configured.
const mailReady = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
const transporter = mailReady
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

if (!mailReady) {
  console.warn('[contact] GMAIL_USER / GMAIL_APP_PASSWORD not set — /api/contact will return 503 until they are.');
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
    if (!transporter) {
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

    await transporter.sendMail({
      from: `"${name} (portfolio)" <${GMAIL_USER}>`, // authenticated sender = your Gmail
      to: CONTACT_TO || GMAIL_USER,
      replyTo: `"${name}" <${email}>`,                // hitting "reply" answers the visitor
      subject: subject ? `Portfolio · ${subject}` : `Portfolio message from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
      html: `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>
             <hr><p>— <strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>`,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[contact] send failed:', err.message);
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
