/**
 * Replace template placeholders with contact field values.
 * Supported tokens: {{name}}, {{first_name}}, {{email}}, {{company}}
 * Unknown tokens are replaced with an empty string.
 */
export function personalize(text, contact) {
  if (!text) return '';

  const firstName = contact.name ? contact.name.trim().split(/\s+/)[0] : '';

  return text
    .replace(/\{\{name\}\}/gi, contact.name || '')
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{email\}\}/gi, contact.email || '')
    .replace(/\{\{company\}\}/gi, contact.company || '');
}
