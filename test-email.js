/* test-email.js — standalone diagnostic for the contact-form mailer.

   Run with:  node test-email.js
   Reads the same env vars as server.js (GMAIL_USER, GMAIL_APP_PASSWORD,
   CONTACT_TO) from .env, verifies the Gmail SMTP connection, then sends one
   real test message to CONTACT_TO. Prints exactly what failed if it fails.   */

require('dotenv').config();
const nodemailer = require('nodemailer');

const { GMAIL_USER, CONTACT_TO } = process.env;
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

(async () => {
  console.log('— Gmail SMTP diagnostic —');
  console.log('GMAIL_USER        :', GMAIL_USER || '(missing)');
  console.log('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? `set (${GMAIL_APP_PASSWORD.length} chars)` : '(missing)');
  console.log('CONTACT_TO        :', CONTACT_TO || '(falls back to GMAIL_USER)');

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('\n✖ Missing credentials. Create a .env file (copy .env.example) first.');
    process.exit(1);
  }
  if (GMAIL_APP_PASSWORD.length !== 16) {
    console.warn(`\n⚠ App password is ${GMAIL_APP_PASSWORD.length} chars; Google app passwords are 16. Double-check it.`);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  try {
    console.log('\n[1/2] Verifying connection…');
    await transporter.verify();
    console.log('      ✓ Connected & authenticated.');

    console.log('[2/2] Sending test email…');
    const info = await transporter.sendMail({
      from: `"Mailer test" <${GMAIL_USER}>`,
      to: CONTACT_TO || GMAIL_USER,
      subject: 'Portfolio mailer test ✓',
      text: 'If you can read this, the contact-form mailer works.',
    });
    console.log('      ✓ Sent. messageId:', info.messageId);
    console.log('\n✔ All good — check your inbox.');
    process.exit(0);
  } catch (err) {
    console.error(`\n✖ FAILED [${err.code || 'ERR'}]: ${err.message}`);
    if (err.code === 'EAUTH')      console.error('   → Wrong app password, or 2-Step Verification / app passwords not enabled.');
    if (err.code === 'ETIMEDOUT')  console.error('   → Connection timed out — host/firewall is blocking outbound SMTP (port 587).');
    if (err.code === 'ECONNECTION')console.error('   → Could not open a connection to smtp.gmail.com.');
    process.exit(1);
  }
})();
