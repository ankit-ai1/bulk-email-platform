const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * Replace template placeholders with contact field values.
 * Supported tokens: {{name}}, {{first_name}}, {{email}}, {{company}}, {{city}}, {{country}}, {{gender}} and any custom field.
 * {{token|fallback}} uses the fallback when the value is empty; unknown tokens become ''.
 * Pass { html: true } for HTML bodies: imported contact data is untrusted.
 */
export function personalize(text, contact, { html = false } = {}) {
  if (!text) return '';

  const firstName = contact.name ? contact.name.trim().split(/\s+/)[0] : '';
  const columns = {
    name: contact.name,
    first_name: firstName,
    email: contact.email,
    company: contact.company,
    city: contact.city,
    country: contact.country,
    gender: contact.gender,
  };
  // An empty column must not hide a custom field of the same name.
  const fields = { ...(contact.custom_fields || {}) };
  for (const [key, value] of Object.entries(columns)) {
    if ((value !== null && value !== undefined && value !== '') || !(key in fields)) fields[key] = value;
  }

  return text.replace(/\{\{\s*([\w.-]+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, (_, key, fallback) => {
    const value = fields[key] ?? fields[key.toLowerCase()];
    const resolved = value === null || value === undefined || value === '' ? (fallback ?? '') : value;
    return html ? escapeHtml(resolved) : String(resolved);
  });
}
