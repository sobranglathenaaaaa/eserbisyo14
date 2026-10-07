import type { Metadata } from 'next';
import ServiceWorkerRegister from '../components/service-worker-register';
import NetworkStatusIndicator from '../components/network-status-indicator';
import '../styles/globals.css';
import '../styles/landing.css';

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        <NetworkStatusIndicator />
        {children}
      </body>
    </html>
  );
}
