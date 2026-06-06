const EDGE_FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/send-bulk-email`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Missing recipient email' });

    const edgeRes = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        contacts: [{ email: to, name: '' }],
        subject: 'Test Email — MailRax',
        htmlBody: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#6c63ff;">Test Email</h2>
          <p>Your AWS SES configuration is working correctly!</p>
          <p style="color:#888;font-size:13px;">Sent from <strong>MailRax</strong>.</p>
        </div>`,
        fromEmail: process.env.FROM_EMAIL,
      }),
    });

    if (!edgeRes.ok) {
      const err = await edgeRes.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Edge function returned ${edgeRes.status}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
