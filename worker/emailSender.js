const EDGE_FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/send-bulk-email`;

const UNSUBSCRIBE_FOOTER_HTML = `
<br>
<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">
<p style="font-size:12px;color:#888;line-height:1.5;">
  You are receiving this email because you are subscribed to our mailing list.<br>
  If you no longer wish to receive these emails, please reply with "Unsubscribe" in the subject line.
</p>`;

/**
 * Send a single email via the Supabase Edge Function (AWS SES).
 * Keeps the same signature as before so callers need no changes.
 */
export async function sendEmail({ to, toName, subject, body, isHtml, fromEmail, fromName }) {
  const htmlBody = isHtml
    ? body + UNSUBSCRIBE_FOOTER_HTML
    : `<p>${body.replace(/\n/g, '<br>')}</p>` + UNSUBSCRIBE_FOOTER_HTML;

  const payload = {
    contacts: [{ email: to, name: toName || '' }],
    subject,
    htmlBody,
    fromEmail: fromEmail || process.env.FROM_EMAIL,
  };

  console.log(`[emailSender] Calling edge function: ${EDGE_FUNCTION_URL}`);
  console.log(`[emailSender] Payload:`, JSON.stringify(payload));

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'apikey': process.env.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  console.log(`[emailSender] Edge function response ${res.status}:`, rawText);

  if (!res.ok) {
    let errMsg;
    try { errMsg = JSON.parse(rawText)?.error || JSON.parse(rawText)?.message; } catch {}
    throw new Error(errMsg || rawText || `Edge function returned ${res.status}`);
  }

  let data = {};
  try { data = JSON.parse(rawText); } catch {}
  return data.messageId || null;
}
