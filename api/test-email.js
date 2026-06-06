function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!supabaseUrl || !supabaseAnonKey || !fromEmail) {
    throw new Error(
      'Missing required server environment variables. Ensure SUPABASE_URL, SUPABASE_ANON_KEY, and FROM_EMAIL are set.'
    );
  }

  return { supabaseUrl, supabaseAnonKey, fromEmail };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { supabaseUrl, supabaseAnonKey, fromEmail } = getSupabaseConfig();
    const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/send-bulk-email`;
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Missing recipient email' });

    const edgeRes = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        contacts: [{ email: to, name: '' }],
        subject: 'Test Email — MailRax',
        htmlBody: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#6c63ff;">Test Email</h2>
          <p>Your AWS SES configuration is working correctly!</p>
          <p style="color:#888;font-size:13px;">Sent from <strong>MailRax</strong>.</p>
        </div>`,
        fromEmail,
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
