import type { Metadata } from 'next';
import { Fraunces, Work_Sans } from 'next/font/google';
import ServiceWorkerRegister from '../components/service-worker-register';
import '../styles/globals.css';
import '../styles/landing.css';

const headingFont = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '600', '700'],
});

const bodyFont = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'eSerbisyo | Digital Barangay Services for Residents and LGUs',
    template: '%s | eSerbisyo',
  },
  description:
    'eSerbisyo helps barangays deliver document processing, incident reporting, and resident communication through one accessible digital service portal.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'eSerbisyo | Digital Barangay Services for Residents and LGUs',
    description:
      'Launch resident registration and streamline barangay operations with request tracking, announcements, feedback, and admin accountability views.',
    type: 'website',
    locale: 'en_PH',
    siteName: 'eSerbisyo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSerbisyo | Digital Barangay Services for Residents and LGUs',
    description:
      'Resident-first online barangay services with request tracking, incident workflows, and accountability dashboards.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
