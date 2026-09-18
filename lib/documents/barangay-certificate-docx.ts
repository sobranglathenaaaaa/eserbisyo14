import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';

const TEMPLATE_FILE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'template', 'BLANK-BARANGAY-CERT-NEW-LOGO-doc.docx'),
];

const REASON_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'reasonEmployment', label: 'Application for Employment' },
  { key: 'reasonResidency', label: 'Proof of Residency' },
  { key: 'reasonMedicalAssistance', label: 'Medical Assistance' },
  { key: 'reasonSjHealthCard', label: 'SJ Health Card' },
  { key: 'reasonTransferResidence', label: 'Transfer of Residence' },
  { key: 'reasonPostalId', label: 'Postal ID' },
  { key: 'reasonSchoolReference', label: 'School Reference' },
  { key: 'reasonBurialAssistance', label: 'Burial Assistance' },
  { key: 'reasonSssGsisPhilhealth', label: 'SSS/GSIS/PHILHEALTH' },
  { key: 'reasonFinancialAssistance', label: 'Financial Assistance' },
  { key: 'reasonSrCitizenId', label: 'SR Citizen ID' },
  { key: 'reasonNonResident', label: 'Non-Resident' },
];

async function resolveTemplatePath() {
  for (const filePath of TEMPLATE_FILE_CANDIDATES) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Continue to next candidate.
    }
  }
  throw new Error(
    'Barangay certificate DOCX template not found. Expected template/BLANK-BARANGAY-CERT-NEW-LOGO-doc.docx.',
  );
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasReasonMark(value: string | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();
  return Boolean(normalized && !['0', 'false', 'no', 'none', 'n/a'].includes(normalized));
}

function resolveIssuedDate(raw: string, fallback: string) {
  const value = raw.trim() || fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

function formatGivenThis(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${day}${suffix} day of ${month}, ${year}`;
}

function buildPrintableHtml(data: {
  residentName: string;
  residentAddressLine: string;
  reasons: string[];
  otherReasonText: string;
  issuedDate: string;
}) {
  const reasonRows = REASON_FIELDS.map((reason) => {
    const checked = data.reasons.includes(reason.label);
    return `<div class="reason-row"><span class="mark">${checked ? 'X' : ''}</span><span>${escapeHtml(reason.label)}</span></div>`;
  }).join('');
  const otherText = data.otherReasonText.trim() ? data.otherReasonText : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barangay Certificate</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: "Bookman Old Style", "Times New Roman", serif; color: #111; background: #dbdbdb; }
    .page { width: 8.5in; height: 11in; margin: 0 auto; background: #fff; padding: 0.17in 0.12in 0.15in; overflow: hidden; }
    .header-logos { display: flex; justify-content: center; align-items: center; gap: 5.6mm; margin-bottom: 1.25mm; }
    .header-logos img { display: block; object-fit: contain; }
    .logo-progreso { width: 13.6mm; height: 13.6mm; }
    .logo-san-juan { width: 13.8mm; height: 13.8mm; }
    .logo-bagong { width: 19.5mm; height: 16.8mm; }
    .gov-header { text-align: center; line-height: 1.1; margin-bottom: 1.25mm; color: #8ca166; font-size: 3mm; font-style: italic; font-weight: 700; }
    .gov-header .line-city { font-weight: 500; }
    .frame { border: 0.35mm solid #151515; display: grid; grid-template-columns: 60mm 1fr; height: 9.38in; position: relative; overflow: hidden; }
    .officials { border-right: 0.35mm solid #151515; padding: 2.3mm 2.35mm 2.1mm; text-align: center; font-size: 2.85mm; line-height: 1.1; font-weight: 700; background: #efefef; }
    .officials p { margin: 0; }
    .officials .spacer-sm { height: 1.2mm; }
    .officials .spacer-md { height: 1.6mm; }
    .officials .role { font-size: 2.2mm; font-weight: 500; line-height: 1.07; }
    .officials .kagawad { font-size: 4.2mm; letter-spacing: 0.2px; font-weight: 700; }
    .certificate { position: relative; padding: 6mm 7.2mm 3.8mm 8mm; font-size: 4.05mm; line-height: 1.33; overflow: hidden; background: #fff; }
    .watermark { position: absolute; left: 50%; top: 55%; width: 130mm; transform: translate(-50%, -50%); opacity: 0.095; z-index: 1; pointer-events: none; user-select: none; }
    .content { position: relative; z-index: 2; }
    .title { margin: 0 0 7mm; text-align: center; font-size: 6.6mm; letter-spacing: 0.25px; font-weight: 700; }
    .line { display: inline-block; border-bottom: 0.3mm solid #202020; min-height: 4.2mm; padding: 0 1mm; text-align: center; vertical-align: baseline; }
    .line-name { min-width: 56mm; }
    .line-address { min-width: 53mm; }
    .reason-copy { margin: 6mm 0 2mm; }
    .reason-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4mm 3mm; margin: 2mm 0 2.5mm; font-size: 3.2mm; line-height: 1.15; }
    .reason-row { display: grid; grid-template-columns: 8mm 1fr; align-items: center; }
    .mark { display: inline-flex; align-items: center; justify-content: center; width: 6.7mm; height: 4.4mm; border-bottom: 0.25mm solid #111; font-weight: 700; }
    .other-row { display: grid; grid-template-columns: auto 1fr; gap: 2mm; align-items: end; font-size: 3.4mm; }
    .other-line { border-bottom: 0.3mm solid #202020; min-height: 4.4mm; padding: 0 1mm; }
    .given-this { margin-top: 5mm; color: #3d672f; font-weight: 700; }
    .valid { color: #b30000; margin-top: 3mm; font-size: 6.2mm; font-weight: 700; }
    .signature { margin-top: 11mm; text-align: right; font-size: 5.2mm; font-weight: 700; line-height: 1.08; }
    .signature small { display: block; font-size: 4.45mm; font-weight: 400; }
    .seal-note { margin-top: 7mm; color: #4f6e34; font-size: 3.1mm; font-weight: 700; line-height: 1.05; }
    .invalid-note { margin-top: 5mm; font-size: 2.75mm; font-weight: 700; text-decoration: underline; text-underline-offset: 0.6px; }
    .contact-note { margin-top: 2.7mm; text-align: center; color: #4f6e34; font-size: 2.45mm; font-style: italic; font-weight: 700; line-height: 1.15; }
    @media print {
      body { background: #fff; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header-logos" aria-hidden="true">
      <img class="logo-progreso" src="/images/indigency-template/barangay-progreso-seal.jpeg" alt="" />
      <img class="logo-san-juan" src="/images/indigency-template/san-juan-seal.jpeg" alt="" />
      <img class="logo-bagong" src="/images/indigency-template/bagong-pilipinas.png" alt="" />
    </section>
    <section class="gov-header">
      <div>REPUBLIC OF THE PHILIPPINES</div>
      <div class="line-city">City Of San Juan</div>
      <div>BARANGAY PROGRESO</div>
      <div>OFFICE OF THE PUNONG BARANGAY</div>
    </section>

    <section class="frame">
      <aside class="officials">
        <p><u>CESAR JR. H. STO. DOMINGO</u></p>
        <p>Punong Barangay</p>
        <p class="role">Senior Citizen &amp; PWD's</p>
        <p class="role">Committee</p>
        <div class="spacer-sm"></div>
        <p class="kagawad">KAGAWAD:</p>
        <div class="spacer-sm"></div>
        <p>Carmencita H. Sto. Domingo</p>
        <p class="role">Peace and Order/BADAC</p>
        <p class="role">Traffic and Parking</p>
        <p class="role">Management Committee</p>
        <div class="spacer-sm"></div>
        <p>Mary Antoinette P. Salayon</p>
        <p class="role">Disaster Management and RedCross</p>
        <p class="role">143/Barangay Volunteer Citizen</p>
        <p class="role">Program Committee</p>
        <div class="spacer-sm"></div>
        <p>Rodelio O. Santos</p>
        <p class="role">Livelihood, Entrepreneurship &amp;</p>
        <p class="role">Public Enterprise Committee</p>
        <div class="spacer-sm"></div>
        <p>Darryl S. Eustaquio</p>
        <p class="role">Infrastructure and Public Works</p>
        <p class="role">Committee</p>
        <div class="spacer-sm"></div>
        <p>Amafel T. Ingalla</p>
        <p class="role">Health, Nutrition and Women and</p>
        <p class="role">Children's Welfare Committee</p>
        <div class="spacer-sm"></div>
        <p>Renar M. Mendoza</p>
        <p class="role">Ways &amp; Means, Appropriations,</p>
        <p class="role">Education, Public Information,</p>
        <p class="role">Cultural Affairs Committee</p>
        <div class="spacer-sm"></div>
        <p>Raymund Marcel B. Fontamillas</p>
        <p class="role">Clean &amp; Green and Solid Waste</p>
        <p class="role">Management Committee</p>
        <div class="spacer-sm"></div>
        <p>Anton Jose T. Cabrillas</p>
        <p class="role">SK-Chairperson</p>
        <p class="role">Youth Sports Development</p>
        <div class="spacer-sm"></div>
        <p>Saturnina C. Mirata</p>
        <p class="role">Barangay Treasurer</p>
        <div class="spacer-md"></div>
        <p>Ma. Theresa R. Dela Cruz</p>
        <p class="role">Barangay Secretary</p>
      </aside>

      <article class="certificate">
        <img class="watermark" src="/images/indigency-template/watermark-seal.png" alt="" />
        <div class="content">
          <h1 class="title">BARANGAY CERTIFICATE</h1>
          <p>
            This is to certify that
            <span class="line line-name">${escapeHtml(data.residentName)}</span>
            is a bonafide resident of
            <span class="line line-address">${escapeHtml(data.residentAddressLine)}</span>
            Barangay Progreso, City of San Juan, Metro Manila.
          </p>
          <p class="reason-copy">
            This certificate is issued upon the aforementioned name for the marked reason only and as specified below:
          </p>
          <div class="reason-list">${reasonRows}</div>
          <div class="other-row">
            <span>Other: Please Specify:</span>
            <span class="other-line">${escapeHtml(otherText)}</span>
          </div>
          <div class="given-this">Given this ${escapeHtml(formatGivenThis(data.issuedDate))}</div>
          <div class="valid">Valid for 3 months</div>
          <div class="signature">CESAR JR. H. STO. DOMINGO<small>Punong Barangay</small></div>
          <div class="seal-note">Not Valid Without<br />Official Seal</div>
          <div class="invalid-note">**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**</div>
          <div class="contact-note">
            #15 M. Cruz Street Barangay Progreso, San Juan City<br />
            Email Address: barangayprogreso@yahoo.com<br />
            Telephone Nos. (02)8727-5635 / (02)76258731
          </div>
        </div>
      </article>
    </section>
  </main>
</body>
</html>`;
}

export async function renderBarangayCertificateFromDocx(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const templatePath = await resolveTemplatePath();
  const templateBuffer = await fs.readFile(templatePath);
  const residentName = (fields.residentName ?? fields.name ?? fields.fullName ?? doc.residentName).trim() || doc.residentName;
  const residentAddressLine = (fields.residentAddressLine ?? fields.address ?? '').trim();
  const reasons = REASON_FIELDS.filter((reason) => hasReasonMark(fields[reason.key])).map((reason) => reason.label);
  const otherReasonText = (fields.otherReasonText ?? '').trim();
  const issuedDate = resolveIssuedDate(fields.issuedDate ?? fields.dateIssued ?? '', doc.dateIssued);

  return {
    docxBuffer: templateBuffer,
    printableHtml: buildPrintableHtml({
      residentName,
      residentAddressLine,
      reasons,
      otherReasonText,
      issuedDate,
    }),
    templatePath,
  };
}
