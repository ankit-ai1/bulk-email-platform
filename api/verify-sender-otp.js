import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );

    const { email, userId, otp } = req.body || {};
    if (!email || !userId || !otp) return res.status(400).json({ error: 'Missing required fields' });

    const { data: record } = await supabase
      .from('sender_emails')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .maybeSingle();

    if (!record) return res.status(400).json({ error: 'Email not found' });
    if (record.is_verified) return res.status(400).json({ error: 'Email already verified' });
    if (record.otp_code !== otp) return res.status(400).json({ error: 'Invalid verification code' });
    if (new Date(record.otp_expires_at) < new Date()) return res.status(400).json({ error: 'Code expired — please resend' });

    const { error: updateError } = await supabase
      .from('sender_emails')
      .update({ is_verified: true, otp_code: null, otp_expires_at: null })
      .eq('user_id', userId)
      .eq('email', email);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
