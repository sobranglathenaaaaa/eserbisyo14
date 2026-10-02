import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveField(fields: CertificateFieldMap, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = fields[key];
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

function resolveIssuedDate(raw: string, fallback: string) {
  const value = raw.trim() || fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

function splitIssuedDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { day: '___', month: '__________' };
  }
  return {
    day: String(date.getDate()),
    month: date.toLocaleString('en-US', { month: 'long' }),
  };
}

export function normalizeBusinessPermitFieldMap(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const issuedDate = resolveIssuedDate(resolveField(fields, ['issuedDate', 'dateIssued']), doc.dateIssued);
  const dateParts = splitIssuedDate(issuedDate);

  return {
    establishmentName: resolveField(fields, ['establishmentName', 'businessName'], '____________________________'),
    ownerName: resolveField(fields, ['ownerName', 'residentName', 'name', 'fullName'], doc.residentName),
    postalAddress: resolveField(fields, ['postalAddress', 'businessAddress', 'address'], '____________________________'),
    issuedDate,
    issuedDay: dateParts.day,
    issuedMonth: dateParts.month,
  };
}

export function buildBusinessPermitPrintableHtml(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const normalized = normalizeBusinessPermitFieldMap(doc, fields);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Business Permit</title>
  <style>
    @page { size: letter portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: "Bookman Old Style", "Times New Roman", serif; color: #111; background: #dbdbdb; }
    .page { position: relative; width: 8.5in; height: 11in; margin: 0 auto; background: #fff; padding: 0.32in 0.85in 0.35in; overflow: hidden; }
    .header-logos { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 0.06in; }
    .header-logos img { display: block; object-fit: contain; }
    .logo-progreso, .logo-san-juan { width: 0.52in; height: 0.52in; }
    .logo-bagong { width: 0.72in; height: 0.58in; }
    .header { text-align: center; color: #7e965d; font-style: italic; line-height: 1.1; font-size: 12px; font-weight: 700; }
    .watermark { position: absolute; left: 50%; top: 55%; width: 5.1in; transform: translate(-50%, -50%); opacity: 0.075; z-index: 1; pointer-events: none; }
    .content { position: relative; z-index: 2; }
    .title { text-align: center; font-size: 27px; font-weight: 700; margin: 0.92in 0 0.42in; letter-spacing: 0.02em; }
    .body { font-size: 18px; line-height: 1.35; }
    .field-line { display: inline-block; border-bottom: 1px solid #222; min-width: 3.1in; min-height: 0.22in; padding: 0 0.08in; text-align: center; }
    .field-label { display: block; margin-top: 1px; font-size: 11px; text-align: center; }
    .field-block { display: inline-block; vertical-align: bottom; }
    .owner-line { min-width: 2.85in; }
    .address-line { min-width: 5.7in; text-align: left; }
    .mt-lg { margin-top: 0.28in; }
    .mt-md { margin-top: 0.2in; }
    .statement { margin-top: 0.28in; text-align: left; font-size: 17px; line-height: 1.42; }
    .signature { margin-top: 0.58in; text-align: right; font-size: 21px; font-weight: 700; }
    .signature small { display: block; font-size: 19px; font-weight: 400; }
    .seal { margin-top: 0.5in; color: #4f6e34; font-size: 17px; font-weight: 700; line-height: 1.1; }
    .invalid { margin-top: 0.08in; font-size: 16px; font-weight: 700; }
    .footer { position: relative; z-index: 2; margin-top: 0.08in; text-align: center; color: #4f6e34; font-size: 9px; font-style: italic; font-weight: 700; line-height: 1.15; }
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
    <section class="header">
      <div>REPUBLIC OF THE PHILIPPINES</div>
      <div><strong>OFFICE OF THE PUNONG BARANGAY</strong></div>
      <div>CITY OF SAN JUAN</div>
      <div><strong>BARANGAY PROGRESO</strong></div>
    </section>

    <img class="watermark" src="/images/indigency-template/watermark-seal.png" alt="" />
    <div class="content">
      <h1 class="title">BARANGAY BUSINESS CLEARANCE</h1>
      <section class="body">
        <div class="field-block">
          <span class="field-line">${escapeHtml(normalized.establishmentName)}</span>
          <span class="field-label">Name of Establishment</span>
        </div>
        <div class="mt-md">is issued to</div>
        <div class="mt-md">
          of
          <span class="field-block">
            <span class="field-line owner-line">${escapeHtml(normalized.ownerName)}</span>
            <span class="field-label">Name of Owner</span>
          </span>
        </div>
        <div class="mt-lg">With postal address at</div>
        <div>
          <span class="field-block">
            <span class="field-line address-line">${escapeHtml(normalized.postalAddress)}</span>
            <span class="field-label">San Juan City</span>
          </span>
        </div>
        <p class="statement">
          This clearance is issued upon the request of the aforementioned name granted that no law/city ordinance/resolution shall be violated upon the duration of the operations or renewal of the aforementioned clearance shall not be granted.
        </p>
        <div class="mt-lg">Issued this ${escapeHtml(normalized.issuedDay)} day of ${escapeHtml(normalized.issuedMonth)} at Barangay Progreso, San Juan City.</div>
        <div class="signature">CESAR JR. H. STO. DOMINGO<small>Punong Barangay</small></div>
        <div class="seal">Not Valid Without<br />Official Seal</div>
        <div class="invalid">**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**</div>
      </section>
    </div>
    <section class="footer">
      <div>#15 M. Cruz Street Barangay Progreso, City of San Juan</div>
      <div>Email address: barangayprogreso@yahoo.com</div>
      <div>Telephone Nos. 87275635 / 76258731</div>
    </section>
  </main>
</body>
</html>`;
}

export function buildBusinessPermitIntakeFormHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Business Permit Intake Form</title>
  <style>
    @page { size: A5 portrait; margin: 10mm; }
    body { font-family: "Times New Roman", serif; margin: 0; color: #111; }
    .sheet { border: 1px solid #222; padding: 14px 16px; min-height: 540px; box-sizing: border-box; }
    .header { text-align: center; line-height: 1.2; margin-bottom: 10px; }
    .title { text-align: center; font-size: 22px; font-weight: 700; margin: 8px 0 4px; }
    .subtitle { text-align: center; font-size: 12px; margin-bottom: 10px; color: #111; }
    .field { margin: 10px 0; }
    .label { font-weight: 700; margin-bottom: 4px; display: block; }
    .line { border: 1px solid #222; min-height: 26px; padding: 5px 8px; }
    .note { margin-top: 12px; font-size: 11px; color: #111; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div><strong>BARANGAY PROGRESO</strong></div>
      <div>OFFICE OF THE PUNONG BARANGAY</div>
    </div>
    <div class="title">BUSINESS PERMIT INTAKE FORM</div>
    <div class="subtitle">FOR OCR ISSUANCE</div>
    <div class="field"><span class="label">Name of Establishment</span><div class="line"></div></div>
    <div class="field"><span class="label">Name of Owner</span><div class="line"></div></div>
    <div class="field"><span class="label">With postal address at</span><div class="line"></div></div>
    <div class="field"><span class="label">Issued this (YYYY-MM-DD)</span><div class="line"></div></div>
    <div class="note">This sheet is for walk-in staff OCR issuance and maps to Business Permit fields.</div>
  </div>
</body>
</html>`;
}
