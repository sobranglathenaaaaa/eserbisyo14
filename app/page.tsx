import Image from 'next/image';
import Link from 'next/link';
import {
  adminOutcomes,
  communityFeatures,
  landingSections,
  moduleFeatures,
  requestLifecycle,
  roleCards,
  trustSignals,
  verificationHighlights,
} from '../lib/content/landing';

export default function HomePage() {
  return (
    <>
      <a className="landing-skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="landing-header">
        <div className="landing-container landing-container--header landing-header__inner">
          <Link className="landing-brand" href="/" aria-label="Go to eSerbisyo homepage">
            <Image
              src="/images/progreso.PNG"
              alt="eSerbisyo logo"
              width={84}
              height={84}
              sizes="84px"
              className="landing-brand__logo"
              unoptimized
              priority
            />
            <span className="landing-brand__text">
              <strong>eSerbisyo</strong>
            <span className="landing-brand__kicker">Service and Record Management System</span>
            </span>
          </Link>

          <nav className="landing-nav" aria-label="Homepage sections">
            <a href="#modules">Modules</a>
            <a href="#roles">Roles</a>
            <a href="#how-it-works">How it works</a>
            <a href="#verification">Verification</a>
            <a href="#admins">For Barangay Admins</a>
          </nav>

          <div className="landing-header__cta">
            <Link className="landing-btn landing-btn--ghost" href="/login" aria-label="Log in to your eSerbisyo account">
              Log In
            </Link>
            <Link className="landing-btn" href="/register" aria-label="Sign up as a resident to eSerbisyo">
              Resident Sign Up
            </Link>
          </div>

          <details className="landing-mobile-menu">
            <summary aria-label="Open navigation menu">
              <span />
              <span />
              <span />
            </summary>
            <div className="landing-mobile-menu__panel" aria-label="Mobile navigation">
              <a href="#modules">Modules</a>
              <a href="#roles">Roles</a>
              <a href="#how-it-works">How it works</a>
              <a href="#verification">Verification</a>
              <a href="#admins">For Barangay Admins</a>
              <div className="landing-mobile-menu__auth">
                <Link href="/login" aria-label="Log in to your eSerbisyo account">
                  Log In
                </Link>
                <Link href="/register" aria-label="Sign up as a resident to eSerbisyo">
                  Resident Sign Up
                </Link>
              </div>
            </div>
          </details>
        </div>
      </header>

      <main id="main-content">
        <section id={landingSections.hero.id} className="landing-hero landing-reveal" aria-labelledby="hero-title">
          <div className="landing-container landing-hero__inner">
            <div className="landing-hero__content">
              <p className="landing-eyebrow">{landingSections.hero.eyebrow}</p>
              <h1 id="hero-title">{landingSections.hero.title.en}</h1>
              <p className="landing-hero__description">{landingSections.hero.description.en}</p>
              <div className="landing-hero__cta-row">
                <Link className="landing-btn" href="/register" aria-label="Register now as a resident">
                  Resident Sign Up
                </Link>
                <Link className="landing-btn landing-btn--ghost" href="/login" aria-label="Log in for existing account holders">
                  Log In
                </Link>
              </div>
              <p className="landing-hero__trust">Secure • Verified • Pilot-ready</p>
            </div>
            <aside className="landing-hero__visual" aria-label="Platform support summary">
              <div className="landing-orb landing-orb--one" aria-hidden="true" />
              <article className="landing-hero-panel">
                <p>RESIDENT-FIRST WORKFLOW</p>
                <strong>Submit requests and track progress in one view</strong>
              </article>
            </aside>
          </div>
          <div className="landing-container landing-hero__trust-strip" aria-label="Core trust highlights">
            <div className="landing-strip__grid">
            {trustSignals.map((signal) => (
              <article key={signal.label.en} className="landing-strip__item">
                <span className="landing-icon-chip" aria-hidden="true">
                  {signal.icon}
                </span>
                <div>
                  <p className="landing-strip__value">{signal.value}</p>
                  <h3>{signal.label.en}</h3>
                  <p>{signal.note.en}</p>
                </div>
              </article>
            ))}
            </div>
          </div>
        </section>

        <section id={landingSections.modules.id} className="landing-section landing-section--modules landing-reveal" aria-labelledby="modules-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">{landingSections.modules.eyebrow}</p>
              <h2 id="modules-title">{landingSections.modules.title.en}</h2>
              <p className="landing-section__lead">{landingSections.modules.description.en}</p>
            </header>
            <div className="landing-grid landing-grid--modules">
              {moduleFeatures.map((feature) => (
                <article key={feature.title.en} className="landing-card landing-card--module">
                  <div className="landing-card__module-top">
                    <div className="landing-card__module-header">
                    <span className="landing-icon-chip" aria-hidden="true">
                      {feature.icon}
                    </span>
                    <p className="landing-card__module-label">{feature.label.en}</p>
                    </div>
                    <span className="landing-card__index" aria-hidden="true">
                      {feature.icon}
                    </span>
                  </div>
                  <h3>{feature.title.en}</h3>
                  <p>{feature.summary.en}</p>
                  <ul>
                    {feature.bullets.map((bullet) => (
                      <li key={bullet.en}>{bullet.en}</li>
                    ))}
                  </ul>
                  <Link href={feature.href} aria-label={`Open ${feature.title.en} module`}>
                    View module →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id={landingSections.roles.id} className="landing-section landing-section--alt landing-section--roles landing-reveal" aria-labelledby="roles-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">{landingSections.roles.eyebrow}</p>
              <h2 id="roles-title">{landingSections.roles.title.en}</h2>
              <p className="landing-section__lead">{landingSections.roles.description.en}</p>
            </header>
            <div className="landing-grid landing-grid--roles">
              {roleCards.map((role, index) => (
                <article key={role.role.en} className={`landing-role-card landing-role-card--${index + 1}`}>
                  <span className="landing-icon-chip" aria-hidden="true">
                    {role.icon}
                  </span>
                  <h3>
                    {role.role.en} {role.role.fil ? <span>({role.role.fil})</span> : null}
                  </h3>
                  <p>{role.summary.en}</p>
                  <ul>
                    {role.outcomes.map((outcome) => (
                      <li key={outcome.en}>{outcome.en}</li>
                    ))}
                  </ul>
                  <Link href={role.href} aria-label={`Open ${role.role.en} dashboard`}>
                    See role view
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id={landingSections.lifecycle.id} className="landing-section landing-reveal" aria-labelledby="lifecycle-title">
          <div className="landing-container">
            <div className="landing-lifecycle">
              <header className="landing-lifecycle__intro">
                <p className="landing-eyebrow">{landingSections.lifecycle.eyebrow}</p>
                <h2 id="lifecycle-title">{landingSections.lifecycle.title.en}</h2>
                <p className="landing-section__lead">{landingSections.lifecycle.description.en}</p>
                <p className="landing-lifecycle__note">Each status transition is logged for accountable, resident-visible delivery.</p>
              </header>

              <ol className="landing-timeline" aria-label="Request lifecycle timeline">
                {requestLifecycle.map((item) => (
                  <li key={item.step} className="landing-timeline__item">
                    <span className="landing-timeline__step" aria-hidden="true">
                      {item.step}
                    </span>
                    <article className="landing-timeline__card" aria-label={`${item.title.en} step`}>
                      <p className="landing-timeline__icon" aria-hidden="true">
                        {item.icon}
                      </p>
                      <h3>{item.title.en}</h3>
                      <p>{item.detail.en}</p>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id={landingSections.security.id} className="landing-section landing-section--alt landing-section--security landing-reveal" aria-labelledby="verification-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">{landingSections.security.eyebrow}</p>
              <h2 id="verification-title">{landingSections.security.title.en}</h2>
              <p className="landing-section__lead">{landingSections.security.description.en}</p>
            </header>
            <div className="landing-grid landing-grid--security">
              {verificationHighlights.map((item) => (
                <article key={item.title.en} className="landing-card landing-card--security">
                  <div className="landing-status-row">
                    <span className="landing-icon-chip" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className={item.status === 'live' ? 'landing-tag landing-tag--live' : 'landing-tag landing-tag--upcoming'}>
                      {item.status === 'live' ? 'Live in MVP' : 'MVP+ Upcoming'}
                    </span>
                  </div>
                  <h3>{item.title.en}</h3>
                  <p>{item.detail.en}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id={landingSections.community.id} className="landing-section landing-section--community landing-reveal" aria-labelledby="community-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">{landingSections.community.eyebrow}</p>
              <h2 id="community-title">{landingSections.community.title.en}</h2>
              <p className="landing-section__lead">{landingSections.community.description.en}</p>
            </header>
            <div className="landing-grid landing-grid--community">
              {communityFeatures.map((feature, index) => (
                <article key={feature.title.en} className="landing-card landing-card--community">
                  <span className="landing-card__flow" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="landing-icon-chip" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <h3>{feature.title.en}</h3>
                  <p>{feature.detail.en}</p>
                  <Link href={feature.href} aria-label={`Open ${feature.title.en} page`}>
                    View related page
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id={landingSections.admins.id} className="landing-section landing-section--alt landing-section--admins landing-reveal" aria-labelledby="admins-title">
          <div className="landing-container">
            <header className="landing-section-header">
              <p className="landing-eyebrow">{landingSections.admins.eyebrow}</p>
              <h2 id="admins-title">{landingSections.admins.title.en}</h2>
              <p className="landing-section__lead">{landingSections.admins.description.en}</p>
            </header>
            <article className="landing-admin-summary">
              <p className="landing-admin-summary__lead">
                eSerbisyo supports practical procurement goals: shorter resident turnaround, stronger accountability records, and a safer transition from paper-heavy workflows.
              </p>
              <div className="landing-grid landing-grid--admin-outcomes">
                {adminOutcomes.map((item) => (
                  <section key={item.title.en} className="landing-mini-card">
                    <h3>{item.title.en}</h3>
                    <p>{item.detail.en}</p>
                  </section>
                ))}
              </div>
              <Link className="landing-btn landing-btn--ghost-dark" href="/admin/dashboard" aria-label="Review admin dashboard preview">
                Review admin preview
              </Link>
            </article>
          </div>
        </section>

        <section id="service-coverage" className="landing-final-cta landing-reveal" aria-labelledby="final-cta-title">
          <div className="landing-container landing-final-cta__inner">
            <p className="landing-eyebrow">Service Coverage</p>
            <h2 id="final-cta-title">Launch faster service delivery for every mamamayan in your barangay.</h2>
            <p className="landing-final-cta__lead">Start with resident registration, then scale with staff and admin workflows already mapped to your operational reality.</p>
            <div className="landing-hero__cta-row">
              <Link className="landing-btn" href="/register" aria-label="Start resident signup">
                Resident Sign Up
              </Link>
              <Link className="landing-btn landing-btn--ghost" href="/login" aria-label="Go to login page">
                Log In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-footer__brand">
            <p className="landing-footer__eyebrow">eSerbisyo</p>
            <p className="landing-footer__title">MVP Launch Site</p>
          </div>
          <div className="landing-footer__links">
            <a href="#modules">Modules</a>
            <a href="#verification">Verification</a>
            <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
            <Link href="/data-privacy">Data Privacy</Link>
            <a href="#top" aria-label="Back to top of page">
              Back to top
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
