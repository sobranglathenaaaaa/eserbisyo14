import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './auth.module.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.authPage}>
      <section className={styles.authShell} aria-label="Resident account access">
        <aside className={styles.visualPane} aria-label="Resident-first online services">
          <Image
            src="/images/login-hall.jpg"
            alt="Barangay hall entrance"
            fill
            priority
            sizes="(max-width: 1080px) 100vw, 58vw"
            className={styles.visualImage}
          />
          <div className={styles.visualBrand}>
            <Link className={styles.brandLink} href="/" aria-label="Back to eSerbisyo homepage">
              <Image
                src="/images/progreso.PNG"
                alt="eSerbisyo logo"
                width={140}
                height={140}
                sizes="140px"
                className={styles.brandLogo}
                unoptimized
                priority
              />
              <span className={styles.brandText}>
                <span className={styles.brandName}>eSerbisyo</span>
                <span className={styles.brandTag}>Service and Record Management System</span>
              </span>
            </Link>
          </div>
          <div className={styles.visualOverlay} aria-hidden="true" />
        </aside>

        <section className={styles.authContent}>
          <div className={styles.authInner}>
            {/* brand moved to visual pane */}
            {children}
          </div>
        </section>
      </section>

      <footer className={styles.authFooter}>
        <div className={styles.authFooterInner}>All rights reserved © eSerbisyo | Service and Record Management System</div>
      </footer>
    </main>
  );
}
