import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileText,
  HelpCircle,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Siren,
  Users,
} from 'lucide-react';
import PublicAnnouncements from '../components/public-announcements';
import { getPublicDocumentCatalog } from '../lib/documents/public-catalog';

const services = [
  {
    title: 'Get barangay documents',
    detail: 'Request clearances, certifications, and permits without starting over at the counter.',
    href: '/resident/document-requests',
    icon: FileText,
    label: 'Document requests',
  },
  {
    title: 'Book an appointment',
    detail: 'Choose an available schedule for services that need an in-person visit.',
    href: '/resident/medicines',
    icon: CalendarCheck,
    label: 'Appointments',
  },
  {
    title: 'Report an incident',
    detail: 'Send a complete incident or blotter report with the details your barangay needs.',
    href: '/resident/blotter-reporting',
    icon: Siren,
    label: 'Incident reporting',
  },
  {
    title: 'Reserve a facility',
    detail: 'Check availability and submit a reservation request for barangay facilities.',
    href: '/resident/reservations',
    icon: Building2,
    label: 'Facility reservations',
  },
  {
    title: 'Reserve a service vehicle',
    detail: 'Submit a request for the barangay service vehicle and check its availability.',
    href: '/resident/reservations',
    icon: Building2,
    label: 'Vehicle reservation',
  },
  {
    title: 'Update household information',
    detail: 'Submit your household details for the barangay census and community planning.',
    href: '/resident/census',
    icon: Users,
    label: 'Resident census',
  },
];

const features = [
  ['Request tracking', 'See status changes from submission through release.', FileText],
  ['Email notifications', 'Receive important account and request updates.', Mail],
  ['Official document checks', 'Released documents can include official seals, signatures, and QR data.', ShieldCheck],
  ['Bilingual help', 'Ask eSerbisyo Chatbot questions in English or Filipino.', MessageCircle],
  ['Secure access', 'Your personal information is handled through protected resident access.', LockKeyhole],
  ['Request history', 'Keep a clear record of past requests and service activity.', CheckCircle2],
] as const;

const faqs = [
  ['Sino ang pwedeng mag-register?', 'Residents of Barangay Progreso may register using their personal details and a valid ID for verification.'],
  ['Anong valid IDs ang tinatanggap?', 'Use a current government-issued or barangay-accepted ID. The registration form will ask you to upload the required proof.'],
  ['Gaano katagal ang processing?', 'Processing time depends on the service and the barangay review queue. You will receive status updates when the record changes.'],
  ['Kailangan pa bang pumunta sa barangay hall?', 'Some steps still require an in-person visit. Payment and pickup are still completed at the barangay hall.'],
  ['Paano kung nakalimutan ang password?', 'Use the Forgot Password link on the login page to request a reset email.'],
  ['Protektado ba ang personal data ko?', 'eSerbisyo follows the Data Privacy Act of 2012 (RA 10173) and publishes its privacy terms for residents to review.'],
];

export default async function HomePage() {
  const documentCatalog = await getPublicDocumentCatalog();
  return (
    <>
      <a className="landing-skip-link" href="#main-content">Skip to main content</a>

      <header className="landing-header">
        <div className="landing-container landing-container--header landing-header__inner">
          <Link className="landing-brand" href="/" aria-label="Go to eSerbisyo homepage">
            <Image
              src="/images/progreso.PNG"
              alt="eSerbisyo logo"
              width={72}
              height={72}
              sizes="72px"
              className="landing-brand__logo"
              unoptimized
              priority
            />
            <span className="landing-brand__text">
              <strong>eSerbisyo</strong>
              <span className="landing-brand__kicker">Digital Barangay Services</span>
            </span>
          </Link>

          <nav className="landing-nav" aria-label="Homepage sections">
            <a href="#top">Home</a>
            <a href="#services">Services</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#faqs">FAQs</a>
            <a href="#announcements">Announcements</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="landing-header__cta">
            <Link className="landing-btn landing-btn--ghost" href="/login">Log In</Link>
            <Link className="landing-btn" href="/register">Resident Sign Up</Link>
          </div>

          <details className="landing-mobile-menu">
            <summary aria-label="Open navigation menu"><span /><span /><span /></summary>
            <div className="landing-mobile-menu__panel" aria-label="Mobile navigation">
              <a href="#top">Home</a>
              <a href="#services">Services</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#features">Features</a>
              <a href="#faqs">FAQs</a>
              <a href="#announcements">Announcements</a>
              <a href="#contact">Contact</a>
              <div className="landing-mobile-menu__auth">
                <Link href="/login">Log In</Link>
                <Link href="/register">Resident Sign Up</Link>
              </div>
            </div>
          </details>
        </div>
      </header>

      <main id="main-content">
        <section id="top" className="landing-hero landing-hero--redesigned" aria-labelledby="hero-title">
          <div className="landing-container landing-hero__inner">
            <div className="landing-hero__content">
              <p className="landing-eyebrow">Official pilot system of Barangay Progreso, San Juan City</p>
              <h1 id="hero-title">Barangay services, <em>abot-kamay na.</em></h1>
              <p className="landing-hero__description">
                Mag-request ng barangay documents online, i-track ang status, at makatanggap ng updates, nang hindi na kailangang pumila sa barangay hall.
              </p>
              <div className="landing-hero__cta-row">
                <Link className="landing-btn landing-btn--light" href="/register">
                  Get Started <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link className="landing-btn landing-btn--ghost" href="/login">Login</Link>
              </div>
            </div>
          </div>
        </section>

        <PublicAnnouncements limit={3} />

        <section id="services" className="landing-section landing-section--services" aria-labelledby="services-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">Start here</p>
              <h2 id="services-title">The services residents use most</h2>
              <p className="landing-section__lead">Choose a service to begin. You can follow every request after signing in.</p>
            </header>
            <div className="landing-service-grid">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <Link className="landing-service-card" href={service.href} key={service.title}>
                    <span className="landing-service-card__number">0{index + 1}</span>
                    <span className="landing-service-card__icon"><Icon size={22} strokeWidth={1.8} /></span>
                    <span className="landing-service-card__label">{service.label}</span>
                    <h3>{service.title}</h3>
                    <p>{service.detail}</p>
                    <span className="landing-service-card__action">Open service <ArrowRight size={16} /></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-section--process" aria-labelledby="process-title">
          <div className="landing-container landing-process">
            <div className="landing-process__intro">
              <p className="landing-eyebrow">Simple by design</p>
              <h2 id="process-title">From request to resolution, without the guesswork.</h2>
              <p className="landing-section__lead">Your online account keeps the next step visible, while barangay teams work from the same record.</p>
            </div>
            <ol className="landing-process__steps">
              <li><span>01</span><div><h3>Create your account</h3><p>Register once and verify your email to access resident services.</p></div></li>
              <li><span>02</span><div><h3>Send the details</h3><p>Choose a service and submit the information needed for review.</p></div></li>
              <li><span>03</span><div><h3>Follow the update</h3><p>Check status changes, announcements, and messages from your account.</p></div></li>
              <li><span>04</span><div><h3>Complete the service</h3><p>Receive the next instruction when your request is ready for release or action.</p></div></li>
            </ol>
          </div>
        </section>

        <section id="features" className="landing-section landing-section--features" aria-labelledby="features-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">What you can expect</p>
              <h2 id="features-title">One place for your barangay transactions</h2>
            </header>
            <div className="landing-feature-grid">
              {features.map(([title, detail, Icon]) => (
                <article className="landing-feature-item" key={title}>
                  <span><Icon size={19} /></span>
                  <div><h3>{title}</h3><p>{detail}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="documents" className="landing-section landing-section--documents" aria-labelledby="documents-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">Prepare before you request</p>
              <h2 id="documents-title">Document types and requirements</h2>
              <p className="landing-section__lead">Requirements and fees may vary by request. Confirm the final details in the service form or with the barangay office.</p>
            </header>
            <div className="landing-document-table-wrap">
              <table className="landing-document-table">
                <thead><tr><th>Document</th><th>Common requirements</th><th>Fee</th></tr></thead>
                <tbody>{documentCatalog.map((document) => <tr key={document.id}><td>{document.name}</td><td>Valid ID, purpose, and supporting documents when applicable</td><td>{document.price > 0 ? `PHP ${document.price.toFixed(2)}` : document.pricingNote ?? 'Check with barangay'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="faqs" className="landing-section landing-section--faqs" aria-labelledby="faqs-title">
          <div className="landing-container landing-faq-layout">
            <header className="landing-section-header">
              <p className="landing-eyebrow">Need a quick answer?</p>
              <h2 id="faqs-title">Frequently asked questions</h2>
              <p className="landing-section__lead">Find answers about registration, requirements, processing, and data privacy.</p>
            </header>
            <div className="landing-faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<HelpCircle size={17} /></summary><p>{answer}</p></details>)}</div>
          </div>
        </section>

        <section id="registration-steps" className="landing-section landing-section--registration" aria-labelledby="registration-title">
          <div className="landing-container landing-registration-panel">
            <header className="landing-section-header">
              <p className="landing-eyebrow">Before your first request</p>
              <h2 id="registration-title">Registration steps</h2>
              <p className="landing-section__lead">Prepare these details before creating your resident account.</p>
            </header>
            <ol className="landing-registration-steps">
              <li><span>01</span><div><h3>Prepare a valid ID</h3><p>Have a clear photo or scan of an accepted ID ready for upload.</p></div></li>
              <li><span>02</span><div><h3>Complete your details</h3><p>Enter your name, address, contact information, and household details accurately.</p></div></li>
              <li><span>03</span><div><h3>Verify your email</h3><p>Open the verification email sent to your registered address.</p></div></li>
              <li><span>04</span><div><h3>Wait for barangay approval</h3><p>Your account will be reviewed before you can submit resident requests.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="landing-section landing-section--help" aria-labelledby="help-title">
          <div className="landing-container landing-help-panel">
            <div><p className="landing-eyebrow">For first-time users</p><h2 id="help-title">Need help getting started?</h2><p>Follow the steps on screen or ask a family member to help you register. A tutorial display is also available at the barangay hall.</p></div>
            <Link className="landing-btn landing-btn--outline-dark" href="/register">Register as a resident <ArrowRight size={17} /></Link>
          </div>
        </section>

        <section id="contact" className="landing-section landing-section--about" aria-labelledby="about-title">
          <div className="landing-container landing-about-grid">
            <div><p className="landing-eyebrow">About eSerbisyo</p><h2 id="about-title">A digital front door for Barangay Progreso.</h2><p>eSerbisyo is a resident-first pilot system for clearer service requests, updates, and barangay coordination. Developed by BSIT students of PUP San Juan.</p></div>
            <div className="landing-contact-card"><h3>Barangay Progreso Office</h3><p><MapPin size={16} /> San Juan City, Metro Manila</p><p><Phone size={16} /> +632 727-5635</p><p><Mail size={16} /> brgyprogreso@eserbisyo-sj.com</p><p className="landing-contact-card__hours"><strong>Office hours</strong><br />Monday–Friday · 8:00 AM–5:00 PM</p></div>
          </div>
        </section>

        <section className="landing-final-cta landing-final-cta--redesigned" aria-labelledby="final-cta-title">
          <div className="landing-container landing-final-cta__inner">
            <div><p className="landing-eyebrow">Ready when you are</p><h2 id="final-cta-title">Make your next barangay service request easier.</h2></div>
            <div className="landing-hero__cta-row"><Link className="landing-btn landing-btn--light" href="/register">Create resident account <ArrowRight size={17} /></Link><Link className="landing-btn landing-btn--ghost" href="/login">Log in</Link></div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-footer__brand"><p className="landing-footer__eyebrow">eSerbisyo</p><p className="landing-footer__title">Digital Barangay Services</p></div>
          <div className="landing-footer__links"><a href="#services">Services</a><a href="#how-it-works">How It Works</a><Link href="/terms-and-conditions">Terms of Service</Link><Link href="/data-privacy">Privacy Policy</Link><a href="#contact">Contact</a><a href="#top">Back to top</a></div>
        </div>
      </footer>
    </>
  );
}
