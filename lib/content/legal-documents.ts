export const LEGAL_DOCUMENT_SLUGS = ['terms-and-conditions', 'data-privacy'] as const;

export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number];

export type LegalDocument = {
  slug: LegalDocumentSlug;
  title: string;
  description: string;
  body: string;
  updatedAt: string;
  updatedBy?: string | null;
  persisted: boolean;
};

type LegalDocumentDefaults = Omit<LegalDocument, 'persisted' | 'updatedBy'>;

const LAST_UPDATED = '2026-04-09T00:00:00.000Z';

export const defaultLegalDocuments: Record<LegalDocumentSlug, LegalDocumentDefaults> = {
  'terms-and-conditions': {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    description:
      'Read the Terms and Conditions for eSerbisyo, the Barangay Service and Records Management System of Barangay Progreso, San Juan City.',
    updatedAt: LAST_UPDATED,
    body: `# English

## 1. Acceptance of Terms
By accessing eSerbisyo, you agree to be bound by these Terms. If you do not agree, please discontinue use of the system.

## 2. User Accounts
- You must provide accurate and complete information when registering.
- You are responsible for maintaining the confidentiality of your account credentials.
- Notify the barangay immediately of any unauthorized account use.

## 3. Permitted Use
The system may be used only for:
- Requesting barangay documents, including clearances, certificates, and permits.
- Tracking request status.
- Accessing barangay announcements and information.
- Submitting feedback and inquiries.

## 4. Prohibited Conduct
You agree not to:
- Submit false or misleading information.
- Attempt unauthorized access to other user accounts or system data.
- Use the system for commercial purposes.
- Introduce malware or interfere with system operations.

## 5. Fees and Payments
- Fees for barangay documents are set by barangay ordinance.
- Online payment is not available. All payments must be made in person at the Barangay Hall.
- No additional fees are charged for using the eSerbisyo platform.

## 6. Intellectual Property
eSerbisyo Copyright 2025 by: Baniqued, Bugayong, Francisco, Mante, Manuel, Polytechnic University of the Philippines - San Juan.

All rights reserved. The system may not be copied, modified, or reproduced without proper acknowledgment.

## 7. Disclaimer of Warranties
The system is provided "AS IS" without warranties of any kind. We do not guarantee uninterrupted or error-free operation.

## 8. Limitation of Liability
The Barangay and PUP shall not be liable for any damages arising from your use of the system, including data loss or service interruptions.

## 9. Privacy
Use of the system is governed by our Data Privacy Policy, which explains how we collect and protect your personal information.

## 10. Contact
Barangay Progreso, San Juan City
Address: 15 M. Cruz St., Brgy. Progreso, San Juan City
Contact Details: +632 727-5635

# Filipino

## 1. Pagtanggap sa Mga Tuntunin
Sa paggamit ng eSerbisyo, sumasang-ayon kang sumunod sa mga Tuntuning ito. Kung hindi ka sumasang-ayon, itigil ang paggamit ng sistema.

## 2. Mga User Account
- Dapat tama at kumpleto ang impormasyong ilalagay sa pagpaparehistro.
- Ikaw ang responsable sa pagiging kumpidensyal ng iyong account credentials.
- Ipaalam agad sa barangay kung may hindi awtorisadong paggamit ng iyong account.

## 3. Pinapahintulutang Paggamit
Maaaring gamitin ang sistema para lamang sa:
- Pag-request ng barangay documents, gaya ng clearance, certificate, at permit.
- Pagsubaybay ng status ng request.
- Pag-access sa mga anunsyo at impormasyon ng barangay.
- Pagsumite ng feedback at inquiry.

## 4. Mga Ipinagbabawal na Gawain
Sumasang-ayon kang hindi:
- Magbigay ng mali o mapanlinlang na impormasyon.
- Subukang pumasok nang walang pahintulot sa account o data ng iba.
- Gamitin ang sistema para sa komersyal na layunin.
- Magpasok ng malware o gambalain ang operasyon ng sistema.

## 5. Bayarin at Pagbabayad
- Ang bayad sa barangay documents ay ayon sa barangay ordinance.
- Walang online payment. Lahat ng bayad ay personal na babayaran sa Barangay Hall.
- Walang karagdagang singil sa paggamit ng eSerbisyo platform.

## 6. Intellectual Property
eSerbisyo Copyright 2025 nina: Baniqued, Bugayong, Francisco, Mante, Manuel, Polytechnic University of the Philippines - San Juan.

All rights reserved. Hindi maaaring kopyahin, baguhin, o i-reproduce ang sistema nang walang wastong pagkilala.

## 7. Disclaimer of Warranties
Ang sistema ay ibinibigay nang "AS IS" at walang anumang warranty. Hindi namin ginagarantiya ang tuloy-tuloy o error-free na operasyon.

## 8. Limitasyon ng Pananagutan
Ang Barangay at PUP ay hindi mananagot sa anumang pinsalang dulot ng paggamit ng sistema, kabilang ang data loss o service interruptions.

## 9. Privacy
Ang paggamit ng sistema ay saklaw ng aming Data Privacy Policy na nagpapaliwanag kung paano namin kinokolekta at pinoprotektahan ang iyong personal na impormasyon.

## 10. Contact
Barangay Progreso, San Juan City
Address: 15 M. Cruz St., Brgy. Progreso, San Juan City
Contact Details: +632 727-5635`,
  },
  'data-privacy': {
    slug: 'data-privacy',
    title: 'Data Privacy',
    description: 'Read the Data Privacy policy of eSerbisyo in compliance with the Data Privacy Act of 2012 (RA 10173).',
    updatedAt: LAST_UPDATED,
    body: `# English

## 1. Information We Collect
Personal Information:
- Full name, address, and date of birth.
- Contact details, including email and mobile number.
- Government-issued ID for document requests and registration review.

Transaction Information:
- Documents requested, such as clearance and certificate of residency.
- Request status and history.
- Supporting documents uploaded.

Technical Information:
- IP address, browser type, and device information.
- System usage logs.

## 2. How We Use Your Information
We use your information to:
- Process and fulfill document requests.
- Verify your identity and residency.
- Send notifications about request status.
- Improve system performance and user experience.
- Comply with legal and reporting requirements.

## 3. Data Sharing
We do not sell your personal information.

We may share information with:
- Barangay personnel authorized to process your request.
- Government agencies when required by law, including DILG reporting.
- Service providers for system hosting and maintenance, bound by confidentiality.

## 4. Data Security
We implement appropriate security measures including:
- SSL encryption for data transmission.
- Role-based access controls.
- Firewalls and regular backups.
- Audit logs to monitor system activity.

## 5. Your Rights
Under the Data Privacy Act, you have the right to:
- Access your personal information.
- Correct inaccurate data.
- Object to processing of your data.
- Request deletion of your data, subject to legal retention requirements.

To exercise these rights, contact the Barangay Data Protection Officer.

## 6. Data Retention
We retain your information only as long as necessary:
- Transaction records: 5 years.
- Resident profiles: Until account deletion or 3-5 years of inactivity.
- Audit logs: 3 years.

## 7. Contact Information
Barangay Progreso, San Juan City
Address: 15 M. Cruz St., Brgy. Progreso, San Juan City
Contact Number: +632 727-5635

National Privacy Commission
Website: www.privacy.gov.ph
Email: complaints@privacy.gov.ph

# Filipino

## 1. Impormasyong Kinokolekta Namin
Personal na Impormasyon:
- Buong pangalan, address, at petsa ng kapanganakan.
- Contact details, kabilang ang email at mobile number.
- Government-issued ID para sa document requests at registration review.

Impormasyon sa Transaksyon:
- Mga dokumentong nire-request, gaya ng clearance at certificate of residency.
- Status at history ng request.
- Mga supporting documents na in-upload.

Teknikal na Impormasyon:
- IP address, browser type, at device information.
- System usage logs.

## 2. Paano Namin Ginagamit ang Iyong Impormasyon
Ginagamit namin ang iyong impormasyon upang:
- Proseso at tuparin ang document requests.
- Beripikahin ang iyong pagkakakilanlan at residency.
- Magpadala ng notifications tungkol sa status ng request.
- Pahusayin ang performance ng system at user experience.
- Sumunod sa legal at reporting requirements.

## 3. Pagbabahagi ng Data
Hindi namin ibinebenta ang iyong personal na impormasyon.

Maaari naming ibahagi ang impormasyon sa:
- Barangay personnel na awtorisadong magproseso ng request mo.
- Mga ahensya ng gobyerno kapag hinihingi ng batas, kabilang ang DILG reporting.
- Service providers para sa hosting at maintenance ng system, na may confidentiality obligations.

## 4. Data Security
Nagpapatupad kami ng angkop na security measures kabilang ang:
- SSL encryption para sa data transmission.
- Role-based access controls.
- Firewalls at regular backups.
- Audit logs para subaybayan ang system activity.

## 5. Iyong Mga Karapatan
Sa ilalim ng Data Privacy Act, may karapatan kang:
- Ma-access ang iyong personal na impormasyon.
- Ma-correct ang maling data.
- Tumutol sa pagproseso ng iyong data.
- Humiling ng deletion ng iyong data, batay sa legal retention requirements.

Para gamitin ang mga karapatang ito, makipag-ugnayan sa Barangay Data Protection Officer.

## 6. Data Retention
Iniingatan namin ang impormasyon mo hangga't kailangan lamang:
- Transaction records: 5 taon.
- Resident profiles: Hanggang account deletion o 3-5 taon ng inactivity.
- Audit logs: 3 taon.

## 7. Contact Information
Barangay Progreso, San Juan City
Address: 15 M. Cruz St., Brgy. Progreso, San Juan City
Contact Number: +632 727-5635

National Privacy Commission
Website: www.privacy.gov.ph
Email: complaints@privacy.gov.ph`,
  },
};

export function isLegalDocumentSlug(value: unknown): value is LegalDocumentSlug {
  return typeof value === 'string' && LEGAL_DOCUMENT_SLUGS.includes(value as LegalDocumentSlug);
}

export function withLegalDocumentDefaults(row: Partial<LegalDocument> & { slug: LegalDocumentSlug }): LegalDocument {
  const fallback = defaultLegalDocuments[row.slug];
  return {
    slug: row.slug,
    title: row.title?.trim() || fallback.title,
    description: row.description?.trim() || fallback.description,
    body: row.body?.trim() || fallback.body,
    updatedAt: row.updatedAt || fallback.updatedAt,
    updatedBy: row.updatedBy ?? null,
    persisted: Boolean(row.persisted),
  };
}
