import LegalLayout, { Section } from '../components/shared/LegalLayout'

export default function AcceptableUsePolicyPage() {
  return (
    <LegalLayout
      badge="LEGAL · ACCEPTABLE USE"
      title="Acceptable Use Policy"
      subtitle="This Acceptable Use Policy defines what is and is not permitted when using MailRax. All users must comply with this policy."
      accentColor="#f59e0b"
      date="June 1, 2026"
    >
      <Section title="1. Permitted Uses">
        <p>MailRax may be used for:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Sending newsletters and marketing emails to opted-in subscribers.</li>
          <li>Transactional emails such as order confirmations, receipts, and notifications.</li>
          <li>Internal business communications.</li>
          <li>Promotional campaigns for legitimate products and services.</li>
          <li>Event invitations and announcements to consenting recipients.</li>
        </ul>
      </Section>

      <Section title="2. Prohibited Uses">
        <p>You must not use MailRax to:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Send spam or unsolicited emails to recipients without prior consent.</li>
          <li>Distribute malware, ransomware, viruses, or other harmful software.</li>
          <li>Conduct phishing attacks or attempt to steal credentials or personal data.</li>
          <li>Send content that is defamatory, harassing, threatening, or abusive.</li>
          <li>Promote or facilitate illegal activities of any kind.</li>
          <li>Impersonate individuals, organizations, or brands without authorization.</li>
          <li>Circumvent or attempt to bypass our abuse detection systems.</li>
          <li>Use the platform in a way that degrades service quality for other users.</li>
          <li>Harvest or scrape email addresses from websites or public sources.</li>
        </ul>
      </Section>

      <Section title="3. Prohibited Content Categories">
        <p>The following content categories are explicitly prohibited on MailRax:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Adult content sent to minors or without age verification.</li>
          <li>Content promoting violence, hatred, or discrimination.</li>
          <li>Illegal gambling, pyramid schemes, or multi-level marketing without disclosure.</li>
          <li>Counterfeit goods or intellectual property infringement.</li>
          <li>Content regulated by financial authorities (without proper licensing).</li>
        </ul>
      </Section>

      <Section title="4. Resource Usage">
        <p>You agree not to abuse our infrastructure by:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>Sending volumes that significantly exceed your plan limits.</li>
          <li>Using automated scripts to artificially inflate metrics.</li>
          <li>Attempting denial-of-service attacks on our systems.</li>
        </ul>
      </Section>

      <Section title="5. Enforcement">
        <p>Violations of this policy may result in:</p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>A warning and request to remedy the violation.</li>
          <li>Temporary suspension of sending privileges.</li>
          <li>Permanent account termination without refund.</li>
          <li>Reporting to law enforcement where required by law.</li>
        </ul>
        <p>We reserve the right to act at our sole discretion to protect the integrity of our platform and its users.</p>
      </Section>

      <Section title="6. Contact">
        <p>To report a violation or ask questions about this policy: <a href="mailto:abuse@mailrax.app" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>abuse@mailrax.app</a></p>
      </Section>
    </LegalLayout>
  )
}
