import LegalLayout, { Section } from '../components/shared/LegalLayout'

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      badge="LEGAL · PRIVACY"
      title="Privacy Policy"
      subtitle="This Privacy Policy explains how MailRax collects, uses, and protects your personal information when you use our bulk email platform."
      accentColor="#6c63ff"
      date="June 1, 2026"
    >
      <Section title="1. Information We Collect">
        <p>We collect information you provide directly to us when you create an account, configure campaigns, or contact us for support:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><strong>Account information:</strong> Name, email address, and password.</li>
          <li><strong>Campaign data:</strong> Email lists, templates, and sending history.</li>
          <li><strong>Usage data:</strong> Log data, IP addresses, browser type, and pages visited.</li>
          <li><strong>Payment information:</strong> Processed securely through third-party payment providers; we do not store card details.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Provide, maintain, and improve our services.</li>
          <li>Send transactional emails such as account verification and password resets.</li>
          <li>Monitor and enforce compliance with our policies.</li>
          <li>Respond to support requests and communicate service updates.</li>
          <li>Detect, investigate, and prevent fraudulent or unauthorized activity.</li>
        </ul>
      </Section>

      <Section title="3. Data Sharing">
        <p>We do not sell your personal data. We may share your information with:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><strong>Service providers:</strong> Third-party vendors who assist in operating our platform (e.g., email delivery, database hosting).</li>
          <li><strong>Legal requirements:</strong> When required by law, court order, or governmental authority.</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
        </ul>
      </Section>

      <Section title="4. Data Retention">
        <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>
      </Section>

      <Section title="5. Security">
        <p>We implement industry-standard security measures including encryption in transit (TLS) and at rest. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
      </Section>

      <Section title="6. Your Rights">
        <p>Depending on your location, you may have the right to access, correct, delete, or restrict processing of your personal data. To exercise these rights, contact us at the email below.</p>
      </Section>

      <Section title="7. Cookies">
        <p>We use cookies and similar technologies to maintain your session and analyze platform usage. You can control cookies through your browser settings, though disabling them may affect functionality.</p>
      </Section>

      <Section title="8. Contact">
        <p>For privacy-related questions or requests, contact us at: <a href="mailto:privacy@mailrax.app" style={{ color: '#6c63ff', textDecoration: 'none', fontWeight: 600 }}>privacy@mailrax.app</a></p>
      </Section>
    </LegalLayout>
  )
}
