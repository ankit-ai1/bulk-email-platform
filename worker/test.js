/**
 * Run: node test.js
 * Diagnoses Supabase connection, campaign data, and SendGrid sending.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

console.log('\n========== WORKER DIAGNOSTICS ==========\n');

// 1. Check env vars
console.log('--- ENV VARS ---');
console.log('SUPABASE_URL    :', process.env.SUPABASE_URL || '❌ MISSING');
console.log('SUPABASE_KEY    :', process.env.SUPABASE_SERVICE_KEY ? '✔ set' : '❌ MISSING');
console.log('SENDGRID_KEY    :', process.env.SENDGRID_API_KEY ? '✔ set' : '❌ MISSING');
console.log('FROM_EMAIL      :', process.env.FROM_EMAIL || '❌ MISSING');
console.log('FROM_NAME       :', process.env.FROM_NAME || '(not set)');
console.log('');

// 2. Check Supabase: campaigns
console.log('--- SUPABASE: campaigns table ---');
const { data: campaigns, error: campErr } = await supabase
  .from('campaigns')
  .select('id, name, status, template_id, list_id')
  .order('created_at', { ascending: false })
  .limit(10);

if (campErr) {
  console.error('❌ Supabase error:', campErr.message);
} else if (!campaigns || campaigns.length === 0) {
  console.log('⚠  No campaigns found in the database at all.');
} else {
  console.log(`Found ${campaigns.length} campaign(s):`);
  campaigns.forEach((c) => {
    console.log(`  [${c.status}] "${c.name}" | template_id: ${c.template_id} | list_id: ${c.list_id}`);
  });

  const sending = campaigns.filter((c) => c.status === 'sending');
  if (sending.length === 0) {
    console.log('\n⚠  No campaigns have status = "sending".');
    console.log('   → Go to your app and click "Send Campaign" to set a campaign to sending status.');
  } else {
    console.log(`\n✔ ${sending.length} campaign(s) with status "sending" — worker should pick these up.`);
  }
}
console.log('');

// 3. Check Supabase: contacts
console.log('--- SUPABASE: contacts table ---');
const { data: contacts, error: contErr } = await supabase
  .from('contacts')
  .select('id, email, status, list_id')
  .limit(5);

if (contErr) {
  console.error('❌ Supabase error:', contErr.message);
} else {
  console.log(`Found ${contacts?.length ?? 0} contact(s) (showing up to 5):`);
  contacts?.forEach((c) => console.log(`  [${c.status}] ${c.email} | list_id: ${c.list_id}`));
  const active = contacts?.filter((c) => c.status === 'active');
  if (active?.length === 0) {
    console.log('⚠  None of these contacts have status = "active" — worker will skip them.');
  }
}
console.log('');

// 4. Test SendGrid — send a real email to FROM_EMAIL itself
console.log('--- SENDGRID: test send ---');
if (!process.env.SENDGRID_API_KEY || !process.env.FROM_EMAIL) {
  console.log('⚠  Skipping — SENDGRID_API_KEY or FROM_EMAIL not set.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    await sgMail.send({
      to: process.env.FROM_EMAIL,
      from: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME || 'Worker Test' },
      subject: 'Worker test email',
      text: 'If you received this, SendGrid is configured correctly.',
    });
    console.log(`✔ Test email sent to ${process.env.FROM_EMAIL} — check your inbox.`);
  } catch (err) {
    console.error('❌ SendGrid error:', err.message);
    if (err.response?.body?.errors) {
      err.response.body.errors.forEach((e) => console.error('  SendGrid detail:', e.message));
    }
    console.log('\nCommon fixes:');
    console.log('  • Verify FROM_EMAIL as a Sender Identity at app.sendgrid.com → Settings → Sender Authentication');
    console.log('  • Make sure your API key has "Mail Send" permission');
  }
}

console.log('\n========== END DIAGNOSTICS ==========\n');
