/* ──────────────────────────────────────────────────────────────
   POST /api/contact — Vercel serverless function.

   Emails the portfolio contact-form contents over Resend's HTTPS API
   (port 443), which Vercel allows (Vercel blocks outbound SMTP, so a
   direct Gmail/SMTP path would not work here).

   Required env vars (Vercel → project → Settings → Environment Variables):
     RESEND_API_KEY   API key from https://resend.com/api-keys (starts re_…)
     CONTACT_TO       where messages land — on Resend's free tier this MUST
                      be the email you signed up to Resend with
   Optional:
     MAIL_FROM        the From address. Defaults to onboarding@resend.dev
                      (Resend's shared sender, allowed without a domain).
─────────────────────────────────────────────────────────────── */

const { RESEND_API_KEY, CONTACT_TO } = process.env;
const MAIL_FROM = process.env.MAIL_FROM || 'IN.DI.GIT.AL. <onboarding@resend.dev>';

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Send one email via Resend's REST API, with a hard 9s timeout so the request
// can never hang and stays under Vercel Hobby's 10s function limit. Resend
// normally responds in well under 2s.
async function sendViaResend({ replyTo, subject, text, html }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    if (!RESEND_API_KEY || !CONTACT_TO) {
      console.warn('[contact] RESEND_API_KEY / CONTACT_TO not set.');
      return res.status(503).json({ ok: false, error: 'Email is not configured yet.' });
    }

    // Vercel auto-parses JSON bodies into req.body; fall back if it arrives raw.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const honeypot = String(body.company || '').trim(); // hidden field — bots fill it

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
    const reason = err.name === 'AbortError' ? 'timeout (9s)' : err.message;
    console.error('[contact] send failed:', reason);
    return res.status(500).json({ ok: false, error: 'Could not send your message. Please try again.' });
  }
};
