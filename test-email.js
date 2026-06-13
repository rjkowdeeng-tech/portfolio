/* test-email.js — standalone diagnostic for the contact-form mailer (Resend).

   Run with:  node test-email.js
   Reads the same env vars as server.js (RESEND_API_KEY, CONTACT_TO, MAIL_FROM)
   from .env, checks the API key, then sends one real test message to
   CONTACT_TO. Prints exactly what failed if it fails.                         */

require('dotenv').config();

const { RESEND_API_KEY, CONTACT_TO } = process.env;
const MAIL_FROM = process.env.MAIL_FROM || 'IN.DI.GIT.AL. <onboarding@resend.dev>';

(async () => {
  console.log('— Resend email diagnostic —');
  console.log('RESEND_API_KEY:', RESEND_API_KEY ? `set (${RESEND_API_KEY.slice(0, 4)}…)` : '(missing)');
  console.log('CONTACT_TO    :', CONTACT_TO || '(missing)');
  console.log('MAIL_FROM     :', MAIL_FROM);

  if (!RESEND_API_KEY || !CONTACT_TO) {
    console.error('\n✖ Missing RESEND_API_KEY or CONTACT_TO. Create a .env file (copy .env.example) first.');
    process.exit(1);
  }

  try {
    console.log('\n[1/2] Checking API key…');
    const check = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (!check.ok) throw new Error(`key rejected — HTTP ${check.status}`);
    console.log('      ✓ Key accepted.');

    console.log('[2/2] Sending test email…');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [CONTACT_TO],
        subject: 'Portfolio mailer test ✓',
        text: 'If you can read this, the Resend contact-form mailer works.',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HTTP ${res.status} ${data.name || ''} ${data.message || ''}`.trim());

    console.log('      ✓ Sent. id:', data.id);
    console.log('\n✔ All good — check the', CONTACT_TO, 'inbox.');
    process.exit(0);
  } catch (err) {
    console.error(`\n✖ FAILED: ${err.message}`);
    console.error('   → 401: API key wrong/revoked.');
    console.error('   → 403 "You can only send testing emails to your own email":');
    console.error('       CONTACT_TO must equal the email you signed up to Resend with');
    console.error('       (or verify a domain in Resend to send anywhere).');
    process.exit(1);
  }
})();
