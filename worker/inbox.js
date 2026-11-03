import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase } from './logger.js';
import { getSecret, transportFor } from './mailer.js';
import { assertPublicHost } from './security.js';

export function imapClient(mailbox, password) {
  return new ImapFlow({
    host: mailbox.imap_host, port: mailbox.imap_port, secure: mailbox.imap_secure,
    auth: { user: mailbox.username, pass: password }, logger: false, socketTimeout: 30000,
  });
}

export async function testImap(mailbox, password) {
  await assertPublicHost(mailbox.imap_host);
  const client = imapClient(mailbox, password);
  await client.connect();
  await client.logout();
}

/** Delivery status notifications from the receiving server are how SMTP bounces arrive. */
export function parseBounce(parsed) {
  const from = parsed.from?.value?.[0]?.address?.toLowerCase() || '';
  const isDsn = /mailer-daemon|postmaster/.test(from) || /delivery status|undeliver|returned mail|delivery failure/i.test(parsed.subject || '');
  if (!isDsn) return null;
  const text = parsed.text || '';
  const original = text.match(/^Message-ID:\s*(<[^>]+>)/im)?.[1] || parsed.references?.[0] || null;
  const status = text.match(/\b([245]\.\d{1,3}\.\d{1,3})\b/)?.[1];
  const permanent = status ? status.startsWith('5') : /permanent|does not exist|no such user|user unknown/i.test(text);
  return { messageId: original, type: permanent ? 'hard_bounce' : 'soft_bounce', reason: (status ? `${status} ` : '') + (parsed.subject || 'Bounce') };
}

async function threadKeyFor(orgId, messageId, inReplyTo, references) {
  const candidates = [inReplyTo, ...(references || [])].filter(Boolean);
  if (candidates.length) {
    const { data } = await supabase.from('mail_messages').select('thread_key').eq('org_id', orgId).in('message_id', candidates).limit(1);
    if (data?.[0]) return data[0].thread_key;
    return references?.[0] || inReplyTo;
  }
  return messageId;
}

async function ingest(mailbox, parsed) {
  const messageId = parsed.messageId || `<generated-${crypto.randomUUID()}@synerax>`;
  const references = Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [];
  const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || null;

  const bounce = parseBounce({ ...parsed, references });
  if (bounce?.messageId) {
    const { data: recipient } = await supabase.from('campaign_recipients').select('id')
      .eq('org_id', mailbox.org_id).eq('message_id', bounce.messageId).maybeSingle();
    if (recipient) await supabase.rpc('track_engagement', { p_recipient: recipient.id, p_type: bounce.type, p_machine: false, p_detail: { reason: bounce.reason } });
  }

  // Reply matching stays inside this org, so a forged header can't touch another tenant.
  const replyIds = [parsed.inReplyTo, ...references].filter(Boolean);
  let campaignId = null;
  if (replyIds.length && !bounce) {
    const { data: recipient } = await supabase.from('campaign_recipients').select('id, campaign_id')
      .eq('org_id', mailbox.org_id).in('message_id', replyIds).limit(1).maybeSingle();
    if (recipient) {
      campaignId = recipient.campaign_id;
      await supabase.rpc('track_engagement', { p_recipient: recipient.id, p_type: 'reply', p_machine: false, p_detail: { message_id: messageId } });
    }
  }
  const { data: contact } = fromAddress
    ? await supabase.from('contacts').select('id').eq('org_id', mailbox.org_id).ilike('email', fromAddress).limit(1).maybeSingle()
    : { data: null };

  await supabase.from('mail_messages').upsert({
    org_id: mailbox.org_id, mailbox_id: mailbox.id, folder: 'inbox',
    message_id: messageId, in_reply_to: parsed.inReplyTo || null,
    thread_key: await threadKeyFor(mailbox.org_id, messageId, parsed.inReplyTo, references),
    from_address: fromAddress, from_name: parsed.from?.value?.[0]?.name || null,
    to_addresses: (parsed.to?.value || []).map((a) => a.address).filter(Boolean),
    cc_addresses: (parsed.cc?.value || []).map((a) => a.address).filter(Boolean),
    subject: parsed.subject || '(no subject)', text_body: parsed.text || null,
    html_body: parsed.html || null,
    // Listed for the reader; content stays with the mail provider.
    attachments: (parsed.attachments || []).map((a) => ({ filename: a.filename, size: a.size, contentType: a.contentType })),
    campaign_id: campaignId, contact_id: contact?.id ?? null,
    sent_at: (parsed.date || new Date()).toISOString(),
  }, { onConflict: 'mailbox_id,message_id', ignoreDuplicates: true });
}

export async function syncMailbox(mailbox) {
  const password = await getSecret('mailbox', mailbox.id);
  if (!password) throw new Error('Mailbox password is not configured');
  await assertPublicHost(mailbox.imap_host);
  const client = imapClient(mailbox, password);
  await client.connect();
  let highest = Number(mailbox.last_uid || 0);
  let imported = 0;
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = (await client.search({ uid: `${highest + 1}:*` }, { uid: true })) || [];
      // First sync reads recent history only; later syncs pick up everything new.
      const batch = uids.filter((u) => u > highest).slice(-200);
      for await (const message of client.fetch(batch, { uid: true, source: true }, { uid: true })) {
        await ingest(mailbox, await simpleParser(message.source));
        highest = Math.max(highest, message.uid);
        imported += 1;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  await supabase.from('mailboxes').update({ status: 'healthy', last_error: null, last_synced_at: new Date().toISOString(), last_uid: highest }).eq('id', mailbox.id);
  return imported;
}

export async function syncAllMailboxes() {
  const { data: mailboxes } = await supabase.from('mailboxes').select('*').eq('provider', 'imap');
  for (const mailbox of mailboxes || []) {
    try {
      await syncMailbox(mailbox);
    } catch (err) {
      await supabase.from('mailboxes').update({ status: 'error', last_error: String(err.message).slice(0, 300) }).eq('id', mailbox.id);
    }
  }
}

/** Sends through the mailbox's linked SMTP account and files a copy under Sent. */
export async function sendFromMailbox(mailbox, { to, cc, subject, html, text, inReplyTo, references, attachments }) {
  const { data: account } = await supabase.from('smtp_accounts').select('*')
    .eq('id', mailbox.smtp_account_id).eq('org_id', mailbox.org_id).maybeSingle();
  if (!account) throw new Error('Link an SMTP account to this mailbox before sending');
  const transport = await transportFor(account);
  const info = await transport.sendMail({
    from: { name: account.from_name || mailbox.label, address: mailbox.email },
    to, cc, subject, html, text, inReplyTo, references,
    attachments: (attachments || []).map((a) => ({ filename: a.filename, content: a.content, encoding: 'base64', contentType: a.contentType })),
  });
  const { data, error } = await supabase.from('mail_messages').insert({
    org_id: mailbox.org_id, mailbox_id: mailbox.id, folder: 'sent', is_read: true,
    message_id: info.messageId, in_reply_to: inReplyTo || null,
    thread_key: await threadKeyFor(mailbox.org_id, info.messageId, inReplyTo, references),
    from_address: mailbox.email, to_addresses: [].concat(to), cc_addresses: [].concat(cc || []),
    subject, html_body: html, text_body: text || null,
    attachments: (attachments || []).map((a) => ({ filename: a.filename, contentType: a.contentType })),
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
