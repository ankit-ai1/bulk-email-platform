import nodemailer from 'nodemailer';
import { supabase } from './logger.js';
import { assertPublicHost, decryptSecret, signClick, signToken } from './security.js';

export const publicUrl = () => (process.env.PUBLIC_WORKER_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');

export async function getSecret(ownerType, ownerId, name = 'password') {
  const { data } = await supabase.from('integration_secrets')
    .select('ciphertext').eq('owner_type', ownerType).eq('owner_id', ownerId).eq('name', name).maybeSingle();
  return data ? decryptSecret(data.ciphertext) : null;
}

export async function createTransport(account, password) {
  await assertPublicHost(account.host);
  return nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.username, pass: password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    // Refuse to send credentials or mail in clear text on submission ports.
    requireTLS: !account.secure,
  });
}

const transports = new Map();
/** One pooled-by-reference transport per account; dropped on credential change or restart. */
export async function transportFor(account) {
  if (!transports.has(account.id)) {
    const password = await getSecret('smtp', account.id);
    if (!password) throw new Error('SMTP password is not configured');
    transports.set(account.id, await createTransport(account, password));
  }
  return transports.get(account.id);
}
export const forgetTransport = (id) => transports.delete(id);

async function dkimFor(orgId, fromEmail) {
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  const { data } = await supabase.from('domains')
    .select('id, domain, dkim_selector, dkim_ok').eq('org_id', orgId).eq('domain', domain).maybeSingle();
  if (!data?.dkim_ok) return undefined;
  const privateKey = await getSecret('domain', data.id, 'dkim_private_key');
  return privateKey ? { domainName: data.domain, keySelector: data.dkim_selector, privateKey } : undefined;
}

/** Adds the footer every bulk message must carry and, when enabled, tracking. */
export function prepareHtml(html, { token, organization, trackOpens = true, trackClicks = true, base = publicUrl() }) {
  let out = html;
  if (trackClicks) {
    out = out.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (match, quote, url) => {
      const decoded = url.replace(/&amp;/g, '&');
      if (decoded.startsWith(`${base}/u/`)) return match;
      const encoded = Buffer.from(decoded).toString('base64url');
      return `href=${quote}${base}/t/c/${token}?u=${encoded}&s=${signClick(token, decoded)}${quote}`;
    });
  }
  const sender = [organization?.brand_name || organization?.name, organization?.address].filter(Boolean).join(' · ');
  const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">`
    + `${escapeAttr(sender)}<br><a href="${base}/u/${token}" style="color:#6b7280;">Unsubscribe</a> from these emails.</div>`;
  const pixel = trackOpens ? `<img src="${base}/t/o/${token}.gif" width="1" height="1" alt="" style="display:none;">` : '';
  return /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${footer}${pixel}</body>`) : `${out}${footer}${pixel}`;
}

const escapeAttr = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const htmlToText = (html) => html
  .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h[1-6]>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n').trim();

export async function sendSmtp({ account, orgId, to, toName, subject, html, fromName, token, headers = {} }) {
  const transport = await transportFor(account);
  const base = publicUrl();
  const info = await transport.sendMail({
    from: { name: fromName || account.from_name || '', address: account.from_email },
    to: toName ? { name: toName, address: to } : to,
    subject,
    html,
    text: htmlToText(html),
    dkim: await dkimFor(orgId, account.from_email),
    headers: token ? {
      // RFC 8058 one-click: Gmail and Yahoo require this of bulk senders.
      'List-Unsubscribe': `<${base}/u/${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      ...headers,
    } : headers,
  });
  return info.messageId;
}

export const recipientToken = (id) => signToken('r', id);
export const automationToken = (id) => signToken('a', id);
