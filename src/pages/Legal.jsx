import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

const UPDATED = 'September 29, 2026';

function Doc({ title, intro, sections }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-dark">Legal</p>
      <h1 className="text-[30px] font-bold mt-1">{title}</h1>
      <p className="text-[13px] text-ink-muted mt-1">Last updated {UPDATED}</p>
      <div className="mt-4 rounded-xl bg-brand-softer border border-[#F6DDB2] p-3 text-[13px] text-ink-soft">
        Draft for launch. Have a Philippine lawyer review this before Buzz takes real payments or personal data.
      </div>
      <p className="text-[15px] text-ink-soft mt-6 leading-relaxed">{intro}</p>
      <Card className="mt-6 p-4 sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted mb-2">Contents</p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[13.5px] list-decimal list-inside">
          {sections.map(([h]) => <li key={h}><a href={`#${h.toLowerCase().replace(/[^a-z]+/g, '-')}`} onClick={(e) => { e.preventDefault(); document.getElementById(h.toLowerCase().replace(/[^a-z]+/g, '-'))?.scrollIntoView({ behavior: 'smooth' }); }} className="text-brand-dark hover:underline">{h}</a></li>)}
        </ol>
      </Card>
      <div className="mt-8 space-y-8">
        {sections.map(([h, ...paras], i) => (
          <section key={h} id={h.toLowerCase().replace(/[^a-z]+/g, '-')} className="scroll-mt-24">
            <h2 className="text-[19px] font-bold">{i + 1}. {h}</h2>
            {paras.map((p, j) => (Array.isArray(p)
              ? <ul key={j} className="list-disc pl-5 mt-2 space-y-1 text-[14.5px] text-ink-soft leading-relaxed">{p.map((li) => <li key={li}>{li}</li>)}</ul>
              : <p key={j} className="text-[14.5px] text-ink-soft mt-2 leading-relaxed">{p}</p>))}
          </section>
        ))}
      </div>
    </main>
  );
}

export function Terms() {
  return (
    <Doc
      title="Terms of Service"
      intro="These terms govern your use of Buzz, a marketplace that connects Philippine businesses (“Brands”) with content creators (“Creators”). By creating an account you agree to them. If you don't agree, don't use Buzz."
      sections={[
        ['Who can use Buzz', 'You must be at least 18 years old and able to enter a binding contract under Philippine law. If you sign up for a business, you confirm you are authorized to act for it.', 'Keep your login details private. You are responsible for what happens under your account.'],
        ['What Buzz does', 'Buzz lets Brands post opportunities, lets Creators apply, and gives both sides tools to agree on deliverables, track results and handle payment. Buzz is not a party to the collaboration agreement between a Brand and a Creator, and does not employ Creators.'],
        ['Listings and applications', 'Brands must describe the product, pay, deliverables, deadlines and content rights truthfully. Listings may not promote:', ['Products that are illegal in the Philippines or need an FDA/DTI permit the Brand doesn\'t have', 'Gambling, tobacco, vapes or alcohol aimed at minors', 'Pyramid schemes, investment "opportunities" or loans without SEC/BSP registration', 'Counterfeit or copied goods, including copied indigenous designs'], 'Creators must represent their audience honestly. Buying followers, engagement or clicks is not allowed.'],
        ['Disclosure of paid content', 'Creators must clearly label paid or gifted content (for example #ad, #sponsored or "Paid partnership") in line with the Ad Standards Council code and the Consumer Act of the Philippines (RA 7394). Brands must not ask Creators to hide a paid relationship.'],
        ['Payments, escrow and fees', 'Brands pay Creator fees into Buzz escrow before or during a campaign. Buzz holds the money and releases it to the Creator when the Brand approves the deliverable. If the Brand does not respond within 7 days of submission, the payment is released automatically.', 'Buzz charges Brands a 5% service fee on top of each fee. Creators receive the full agreed fee. Creators may withdraw their balance to GCash, Maya or a Philippine bank account (minimum ₱100).', 'Commission-based pay is calculated from sales tracked through the Creator\'s Buzz link or promo code. Brands must log promo-code sales accurately.', 'Each party is responsible for its own taxes, including BIR registration and receipts where required.'],
        ['Content and rights', 'Creators keep ownership of their content. By accepting a campaign, the Creator grants the Brand the usage right stated in the listing (for example, reposting for 90 days). Anything beyond that needs a separate written agreement.', 'Posts in the Community remain yours. You give Buzz permission to display them on the platform.'],
        ['Disputes between users', 'If a Brand and Creator disagree about a deliverable or payment, either can report it. Buzz will review the messages, deliverables and tracking data on the platform and may release, split or refund escrowed funds. This does not stop either party from going to court.'],
        ['Removing content and accounts', 'Buzz may remove listings, posts or accounts that break these terms, and may suspend accounts during a review. You can close your account at any time from Settings.'],
        ['Liability', 'Buzz provides the platform "as is". To the extent the law allows, Buzz is not liable for the quality of products, the performance of content, or losses from a collaboration. Nothing here limits rights you have as a consumer under Philippine law, including the Internet Transactions Act of 2023 (RA 11967).'],
        ['Changes and governing law', 'We will notify you in the app and by email before material changes take effect. These terms are governed by the laws of the Republic of the Philippines, and the courts of Quezon City have jurisdiction.'],
        ['Contact', 'Questions about these terms: legal@buzz.ph.'],
      ]}
    />
  );
}

export function Privacy() {
  return (
    <Doc
      title="Privacy Policy"
      intro="Buzz processes personal data in line with the Data Privacy Act of 2012 (RA 10173), its Implementing Rules, and issuances of the National Privacy Commission (NPC). This policy explains what we collect, why, and the rights you have."
      sections={[
        ['What we collect', ['Account details: name, email, password (stored hashed), city and region', 'Profile details: business name and category, or creator handle, platforms, follower counts, engagement rate, rates and audience description', 'Activity: listings, applications, messages, deliverables, community posts, reviews and reports', 'Payment details: escrow and withdrawal records, and the GCash, Maya or bank account you withdraw to', 'Tracking data: clicks on creator tracking links (time and link only; we do not store the visitor\'s identity) and sales logged by Brands']],
        ['Why we use it', ['To run your account and show your public profile', 'To match Brands and Creators and calculate Match %', 'To process escrow payments and withdrawals', 'To send notifications and emails you chose to receive', 'To keep the platform safe: fraud checks, moderation and dispute review', 'To meet legal obligations, including tax and anti-money-laundering rules'], 'Our lawful bases are your consent, the performance of our contract with you, and our legitimate interest in keeping Buzz safe (Section 12 of RA 10173).'],
        ['Who can see your data', 'Your public profile, listings and community posts are visible to other users. Messages are visible only to the people in the conversation. Earnings and sales you drove are private unless you turn on "Show sales I\'ve driven" in Settings → Privacy.', 'We share data with service providers that help us run Buzz (hosting, email delivery, payment processing) under data sharing agreements, and with authorities when the law requires it. We never sell your personal data.'],
        ['How long we keep it', 'We keep account data while your account is open. After you close it, we delete or anonymize it within 90 days, except records we must keep longer by law (for example, payment records kept for 10 years for BIR purposes).'],
        ['Your rights', 'Under RA 10173 you have the right to be informed, to access, to object, to erasure or blocking, to correct, to data portability, and to file a complaint with the NPC. To use any of these rights, email privacy@buzz.ph. We respond within 15 working days.'],
        ['Security', 'We use encryption in transit, hashed passwords and access controls, and we limit staff access to what their role needs. If a breach affects your data, we will notify you and the NPC within 72 hours as required.'],
        ['Cookies and storage', 'Buzz uses your browser\'s storage to keep you logged in and remember preferences. We do not use advertising cookies.'],
        ['Data Protection Officer', 'Buzz Data Protection Officer · privacy@buzz.ph · Quezon City, Philippines. You may also contact the National Privacy Commission at privacy.gov.ph.'],
      ]}
    />
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-[13px] text-ink-muted">
        <span>© {new Date().getFullYear()} Buzz · Made in the Philippines</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/pricing" className="hover:text-ink">Pricing</Link>
          <Link to="/help" className="hover:text-ink">Help center</Link>
          <Link to="/terms" className="hover:text-ink">Terms</Link>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
          <Link to="/community" className="hover:text-ink">Community</Link>
          <span>support@buzz.ph</span>
        </nav>
      </div>
    </footer>
  );
}
