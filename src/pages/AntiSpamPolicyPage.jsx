import LegalLayout, { Section } from '../components/shared/LegalLayout'

export default function AntiSpamPolicyPage() {
  return (
    <LegalLayout
      badge="LEGAL · ANTI-SPAM"
      title="Anti-Spam Policy"
      subtitle="MailRax has a zero-tolerance policy for spam. This policy outlines our requirements for responsible email sending."
      accentColor="#ef4444"
      date="June 1, 2026"
    >
      <Section title="1. Definition of Spam">
        <p>Spam refers to unsolicited bulk email — messages sent to recipients who have not explicitly consented to receive communications from you. Spam is illegal in many jurisdictions and harmful to recipients and the broader email ecosystem.</p>
      </Section>

      <Section title="2. Consent Requirements">
        <p>All recipients on your mailing lists must have explicitly opted in to receive emails from you. Acceptable forms of consent include:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>A confirmed double opt-in via a subscription form.</li>
          <li>A written or digital agreement to receive marketing communications.</li>
          <li>A prior business relationship where email communication was reasonably expected.</li>
        </ul>
        <p>Purchased, rented, or scraped email lists are strictly prohibited.</p>
      </Section>

      <Section title="3. Prohibited Content">
        <p>You may not use MailRax to send:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Unsolicited commercial email (spam).</li>
          <li>Phishing or fraudulent messages designed to deceive recipients.</li>
          <li>Malware, viruses, or malicious attachments.</li>
          <li>Content that promotes illegal activities.</li>
          <li>Misleading subject lines or sender information.</li>
          <li>Content that violates any applicable law including CAN-SPAM, GDPR, or CASL.</li>
        </ul>
      </Section>

      <Section title="4. Unsubscribe Requirements">
        <p>Every email you send must include a clear and functional unsubscribe mechanism. You must:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Include an unsubscribe link in every marketing email.</li>
          <li>Honor unsubscribe requests within 10 business days.</li>
          <li>Never charge a fee or require additional information to process an unsubscribe.</li>
        </ul>
      </Section>

      <Section title="5. Complaint Handling">
        <p>We monitor spam complaint rates. If your complaint rate exceeds acceptable thresholds, we may:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Issue a warning and require you to clean your lists.</li>
          <li>Temporarily suspend your sending privileges.</li>
          <li>Permanently terminate your account for repeated or severe violations.</li>
        </ul>
      </Section>

      <Section title="6. Compliance with Laws">
        <p>You are responsible for ensuring your email campaigns comply with all applicable anti-spam laws, including:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><strong>CAN-SPAM Act</strong> (United States)</li>
          <li><strong>GDPR</strong> (European Union)</li>
          <li><strong>CASL</strong> (Canada)</li>
          <li><strong>PECR</strong> (United Kingdom)</li>
        </ul>
      </Section>

      <Section title="7. Reporting Spam">
        <p>If you receive spam sent via MailRax, please report it to: <a href="mailto:abuse@mailrax.app" style={{ color: '#ef4444', textDecoration: 'none', fontWeight: 600 }}>abuse@mailrax.app</a>. We investigate all reports and take appropriate action.</p>
      </Section>
    </LegalLayout>
  )
}
