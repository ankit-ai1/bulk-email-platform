import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const UNSUBSCRIBE_FOOTER_HTML = `
<br>
<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">
<p style="font-size:12px;color:#888;line-height:1.5;">
  You are receiving this email because you are subscribed to our mailing list.<br>
  If you no longer wish to receive these emails, please reply with "Unsubscribe" in the subject line.
</p>`;

const UNSUBSCRIBE_FOOTER_TEXT =
  '\n\n---\nYou are receiving this email because you are subscribed to our mailing list.\nTo unsubscribe, reply with "Unsubscribe" in the subject line.';

/**
 * Send a single email via SendGrid.
 * Returns the SendGrid message ID on success.
 * Throws on failure (caller handles retry).
 */
export async function sendEmail({ to, toName, subject, body, isHtml, fromEmail, fromName }) {
  const msg = {
    to: toName ? { email: to, name: toName } : to,
    from: {
      email: fromEmail || process.env.FROM_EMAIL,
      name: fromName || process.env.FROM_NAME,
    },
    subject,
  };

  if (isHtml) {
    msg.html = body + UNSUBSCRIBE_FOOTER_HTML;
    msg.text = stripHtml(body) + UNSUBSCRIBE_FOOTER_TEXT;
  } else {
    msg.text = body + UNSUBSCRIBE_FOOTER_TEXT;
  }

  const [response] = await sgMail.send(msg);
  return response.headers['x-message-id'] || null;
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
