import PublicLayout from '../components/shared/PublicLayout'

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{title}</h2>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </section>
  )
}

export default function TermsOfServicePage() {
  return (
    <PublicLayout>
      <div style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Last updated: June 1, 2026</p>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Terms of Service</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          By accessing or using MailRax, you agree to be bound by these Terms of Service. Please read them carefully.
        </p>
      </div>

      <Section title="1. Acceptance of Terms">
        <p>By creating an account or using MailRax in any way, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform.</p>
      </Section>

      <Section title="2. Eligibility">
        <p>You must be at least 18 years old and capable of forming a binding contract to use MailRax. By using our service, you represent that you meet these requirements.</p>
      </Section>

      <Section title="3. Your Account">
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You are responsible for all activities that occur under your account.</li>
          <li>You must notify us immediately of any unauthorized use of your account.</li>
          <li>You may not share, sell, or transfer your account to another party.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree to use MailRax only for lawful purposes. You must not:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>Send unsolicited bulk email (spam) to recipients who have not opted in.</li>
          <li>Use the platform to distribute malware, phishing content, or illegal material.</li>
          <li>Impersonate any person or entity or misrepresent your affiliation.</li>
          <li>Violate any applicable local, national, or international laws or regulations.</li>
          <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
        </ul>
      </Section>

      <Section title="5. Service Availability">
        <p>We strive to maintain high availability but do not guarantee uninterrupted access. We may suspend or terminate access for maintenance, policy violations, or other reasons at our discretion with reasonable notice where possible.</p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>MailRax and its content, features, and functionality are owned by us and are protected by applicable intellectual property laws. You retain ownership of the content you create and upload to the platform.</p>
      </Section>

      <Section title="7. Limitation of Liability">
        <p>To the maximum extent permitted by law, MailRax shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability shall not exceed the amount you paid us in the past 12 months.</p>
      </Section>

      <Section title="8. Termination">
        <p>We reserve the right to suspend or terminate your account for violations of these terms, with or without prior notice. You may also delete your account at any time from your account settings.</p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>We may update these Terms from time to time. We will notify you of significant changes via email or an in-app notice. Continued use of the platform after changes constitutes acceptance.</p>
      </Section>

      <Section title="10. Contact">
        <p>Questions about these Terms? Contact us at: <a href="mailto:legal@mailrax.app" style={{ color: 'var(--accent)' }}>legal@mailrax.app</a></p>
      </Section>
    </PublicLayout>
  )
}
