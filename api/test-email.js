const sgMail = require('@sendgrid/mail');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const { to } = req.body || {};
  if (!to) return res.status(400).json({ error: 'Missing recipient email' });

  try {
    await sgMail.send({
      to,
      from: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME || 'MailForge' },
      subject: 'Test Email — MailForge',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#6c63ff;">Test Email</h2>
        <p>Your SendGrid configuration is working correctly!</p>
        <p style="color:#888;font-size:13px;">Sent from <strong>MailForge</strong>.</p>
      </div>`,
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    const detail = err.response?.body?.errors?.[0]?.message || err.message;
    return res.status(500).json({ error: detail });
  }
};
