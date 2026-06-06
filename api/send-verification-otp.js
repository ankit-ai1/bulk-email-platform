import { createClient } from '@supabase/supabase-js';

const EDGE_FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/send-bulk-email`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );

    const { email, name, userId } = req.body || {};
    if (!email || !userId) return res.status(400).json({ error: 'Missing email or userId' });

    const { data: existing } = await supabase
      .from('sender_emails')
      .select('is_verified')
      .eq('user_id', userId)
      .eq('email', email)
      .maybeSingle();

    if (existing?.is_verified) return res.status(400).json({ error: 'This email is already verified' });

    if (!existing) {
      const { count } = await supabase
        .from('sender_emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (count >= 20) return res.status(400).json({ error: 'Maximum 20 sender emails allowed' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('sender_emails')
      .upsert({
        user_id: userId,
        email,
        name: name || '',
        is_verified: false,
        otp_code: otp,
        otp_expires_at: expiresAt,
      }, { onConflict: 'user_id,email' });

    if (dbError) throw new Error(dbError.message);

    const edgeRes = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        contacts: [{ email, name: name || '' }],
        subject: 'Verify your sender email — MailRax',
        htmlBody: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#6c63ff;margin-bottom:16px;">Verify Your Email</h2>
          <p style="color:#333;">Use the code below to verify <strong>${email}</strong> as a sender in MailRax.</p>
          <div style="background:#f4f3ff;border:2px solid #6c63ff;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#6c63ff;">${otp}</span>
          </div>
          <p style="color:#888;font-size:13px;">Expires in 15 minutes. If you didn't request this, ignore this email.</p>
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
