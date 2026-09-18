import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { toIndigencyDocxTemplateData, type CertificateFieldMap } from '@/lib/documents/indigency-certificate';

const TEMPLATE_FILE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'template', 'BLANK-INDIGENCY-WITH-NEW-LOGO-KIM.docx'),
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'template', 'certificate-indigency.docx'),
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'templates', 'certificate-indigency.docx'),
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
    'Indigency DOCX template not found. Expected template/BLANK-INDIGENCY-WITH-NEW-LOGO-KIM.docx.',
  );
}

function wrapPrintableHtml(data: {
  residentName: string;
  address: string;
  requestedBy: string;
  issuedDay: string;
  issuedMonth: string;
  issuedYear: string;
}) {
  const residentName = escapeHtml(data.residentName);
  const address = escapeHtml(data.address);
  const requestedBy = escapeHtml(data.requestedBy);
  const issuedDay = escapeHtml(data.issuedDay);
  const issuedMonth = escapeHtml(data.issuedMonth);
  const issuedYear = escapeHtml(data.issuedYear);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate of Indigency</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      font-family: "Bookman Old Style", "Times New Roman", serif;
      color: #111;
      background: #dbdbdb;
    }
    .page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 4mm 3mm 3.5mm;
      overflow: hidden;
    }
    .header-logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 5.6mm;
      margin-bottom: 1.25mm;
    }
    .header-logos img { display: block; object-fit: contain; }
    .header-logos .logo-progreso { width: 13.6mm; height: 13.6mm; }
    .header-logos .logo-san-juan { width: 13.8mm; height: 13.8mm; }
    .header-logos .logo-bagong { width: 19.5mm; height: 16.8mm; }
    .gov-header {
      text-align: center;
      line-height: 1.1;
      margin-bottom: 1.25mm;
      color: #8ca166;
      font-size: 3mm;
      font-style: italic;
      font-weight: 700;
    }
    .gov-header .line-city { font-weight: 500; }
    .frame {
      border: 0.35mm solid #151515;
      display: grid;
      grid-template-columns: 60mm 1fr;
      height: 274mm;
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .officials {
      border-right: 0.35mm solid #151515;
      padding: 2.3mm 2.35mm 2.1mm;
      text-align: center;
      font-size: 2.85mm;
      line-height: 1.1;
      font-weight: 700;
      background: #efefef;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .officials p { margin: 0; }
    .officials .spacer-sm { height: 1.2mm; }
    .officials .spacer-md { height: 1.6mm; }
    .officials .role {
      font-size: 2.2mm;
      font-weight: 500;
      line-height: 1.07;
    }
    .officials .kagawad {
      font-size: 4.2mm;
      letter-spacing: 0.2px;
      font-weight: 700;
    }
    .certificate {
      position: relative;
      padding: 7.2mm 8.5mm 3.8mm 10.6mm;
      font-size: 4.6mm;
      line-height: 1.42;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .watermark {
      position: absolute;
      left: 49%;
      top: 55%;
      width: 130mm;
      transform: translate(-50%, -50%);
      opacity: 0.095;
      z-index: 1;
      pointer-events: none;
      user-select: none;
    }
    .content { position: relative; z-index: 2; }
    .title {
      margin: 0;
      text-align: center;
      font-size: 6.2mm;
      letter-spacing: 0.35px;
      font-weight: 700;
    }
    .lead {
      margin: 6.4mm 0 3.2mm;
      font-size: 4.5mm;
      font-weight: 500;
    }
    .body-copy {
      margin: 0;
      font-size: 4.3mm;
      text-align: justify;
    }
    .field-line {
      display: inline-block;
      border-bottom: 0.3mm solid #202020;
      min-height: 2.7mm;
      vertical-align: baseline;
      padding: 0 0.55mm;
      margin: 0 0.2mm;
    }
    .line-name { min-width: 37mm; text-align: center; }
    .line-address { min-width: 50mm; text-align: center; }
    .line-requested-by { min-width: 54mm; text-align: center; }
    .line-day { min-width: 14mm; text-align: center; }
    .line-month-year { min-width: 40mm; text-align: center; }
    .paragraph-gap { margin-top: 8.7mm; }
    .issued-gap { margin-top: 8.1mm; }
    .signature {
      margin-top: 13mm;
      text-align: right;
      font-size: 5.35mm;
      font-weight: 700;
      line-height: 1.08;
    }
    .signature .role {
      font-size: 4.55mm;
      font-weight: 500;
    }
    .seal-note {
      margin-top: 8.4mm;
      color: #4f6e34;
      font-size: 3.1mm;
      font-weight: 700;
      line-height: 1.05;
    }
    .invalid-note {
      margin-top: 6mm;
      font-size: 2.75mm;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 0.6px;
      letter-spacing: 0.1px;
    }
    .contact-note {
      margin-top: 2.7mm;
      text-align: center;
      color: #4f6e34;
      font-size: 2.45mm;
      font-style: italic;
      font-weight: 700;
      line-height: 1.15;
    }
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
        <p class="role">143/Barangay Volunteers Citizen</p>
        <p class="role">Program Committee</p>
        <div class="spacer-sm"></div>
        <p>Rodelio O. Santos</p>
        <p class="role">Livelihood, Entrepreneurship &amp;</p>
        <p class="role">Public Enterprise Committee</p>
        <div class="spacer-sm"></div>
        <p>Darryl S. Eustaquio</p>
        <p class="role">Infrastructure and Public</p>
        <p class="role">Works Committee</p>
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
        <p class="role">Sk-Chairperson</p>
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
          <h1 class="title">CERTIFICATE OF INDIGENCY</h1>
          <p class="lead">TO WHOM IT MAY CONCERN:</p>
          <p class="body-copy">
            This is to certify that
            <span class="field-line line-name">${residentName}</span>
            whose residence at
            <span class="field-line line-address">${address}</span>
            is within the jurisdiction of Brgy. Progreso, City of San Juan and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.
          </p>
          <p class="body-copy paragraph-gap">
            This certification is being issued upon the request of Mr./Mrs./Ms
            <span class="field-line line-requested-by">${requestedBy}</span>
            for whatever legal purpose it may serve him/her.
          </p>
          <p class="body-copy issued-gap">
            Issued this
            <span class="field-line line-day">${issuedDay}</span>
            day of
            <span class="field-line line-month-year">${issuedMonth}, ${issuedYear}</span>.
          </p>
          <div class="signature">
            CESAR JR. H. STO. DOMINGO
            <div class="role">Punong Barangay</div>
          </div>
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

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function renderIndigencyCertificateFromDocx(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const templatePath = await resolveTemplatePath();
  const templateBuffer = await fs.readFile(templatePath);
  const data = toIndigencyDocxTemplateData(doc, fields);

  return {
    docxBuffer: templateBuffer,
    printableHtml: wrapPrintableHtml(data),
    templatePath,
  };
}
