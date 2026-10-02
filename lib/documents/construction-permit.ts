import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';

const PERMIT_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'permitMayorsBusiness', label: "Mayor's Business Permit" },
  { key: 'permitBuilding', label: 'Building Permit' },
  { key: 'permitOccupancy', label: 'Occupancy Permit' },
  { key: 'permitExcavation', label: 'Excavation Permit' },
  { key: 'permitDemolition', label: 'Demolition Permit' },
  { key: 'permitRenovationRepair', label: 'Renovation/Repair Permit' },
  { key: 'permitConstruction', label: 'Construction Permit' },
  { key: 'permitHauling', label: 'Hauling Permit' },
  { key: 'permitSignageBillboards', label: 'Signage/Billboards Permit' },
  { key: 'permitOther', label: 'Others' },
];

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

function hasMark(value: string | undefined) {
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
  if (Number.isNaN(date.getTime())) return '____ day of _________';
  return `${date.getDate()} day of ${date.toLocaleString('en-US', { month: 'long' })}`;
}

export function normalizeConstructionPermitFieldMap(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const otherPermitText = resolveField(fields, ['otherPermitText', 'otherPermit', 'permitOtherText']);
  const selectedPermits = PERMIT_OPTIONS.filter((option) => hasMark(fields[option.key])).map((option) => option.label);

  return {
    selectedPermits,
    otherPermitText,
    ownerName: resolveField(fields, ['ownerName', 'residentName', 'name', 'fullName'], doc.residentName),
    ownerAddress: resolveField(fields, ['ownerAddress', 'address', 'residenceAddress'], '____________________________'),
    issuedDate: resolveIssuedDate(resolveField(fields, ['issuedDate', 'dateIssued']), doc.dateIssued),
  };
}

export function buildConstructionPermitPrintableHtml(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const normalized = normalizeConstructionPermitFieldMap(doc, fields);
  const rows = PERMIT_OPTIONS.map((option) => {
    const checked =
      normalized.selectedPermits.includes(option.label);
    const label =
      option.key === 'permitOther' && checked && normalized.otherPermitText
        ? `Others (${normalized.otherPermitText})`
        : option.label;
    return `<div class="permit-row"><span class="mark">${checked ? 'X' : ''}</span><span>${escapeHtml(label)}</span></div>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Construction Permit</title>
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
    .title { text-align: center; font-size: 27px; font-weight: 700; margin: 0.38in 0 0.16in; letter-spacing: 0.02em; }
    .body { font-size: 16.5px; line-height: 1.28; }
    .permit-list { margin: 0.14in 0 0.16in 1.2in; display: grid; gap: 0; }
    .permit-row { display: grid; grid-template-columns: 0.32in 1fr; align-items: center; }
    .mark { display: inline-flex; align-items: center; justify-content: center; width: 0.26in; height: 0.18in; border-bottom: 1px solid #222; font-weight: 700; }
    .section-label { font-size: 18px; font-weight: 700; margin-top: 0.12in; }
    .line { display: block; border-bottom: 1px solid #222; min-height: 0.24in; padding: 1px 0.08in; margin-top: 0.04in; }
    .line-label { display: block; text-align: center; font-size: 11px; margin-bottom: 0.05in; }
    .statement { margin-top: 0.16in; text-align: left; }
    .signature { margin-top: 0.28in; text-align: right; font-size: 21px; font-weight: 700; }
    .signature small { display: block; font-size: 19px; font-weight: 400; }
    .seal { margin-top: 0.3in; color: #4f6e34; font-size: 17px; font-weight: 700; line-height: 1.1; }
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
      <div>CITY OF SAN JUAN</div>
      <div><strong>OFFICE OF THE PUNONG BARANGAY</strong></div>
      <div><strong>BARANGAY PROGRESO</strong></div>
    </section>

    <img class="watermark" src="/images/indigency-template/watermark-seal.png" alt="" />
    <div class="content">
      <h1 class="title">BARANGAY CLEARANCE</h1>
      <section class="body">
        <div>TO WHOM IT MAY CONCERN:</div>
        <p>This is to certify that the Sangguniang Barangay of Progreso, San Juan City interposes no objection to the issuance of:</p>
        <div class="permit-list">${rows}</div>
        <div class="section-label">IN FAVOR OF:</div>
        <span class="line">${escapeHtml(normalized.ownerName)}</span>
        <span class="line-label">(Name of Owner)</span>
        <span class="line">${escapeHtml(normalized.ownerAddress)}</span>
        <span class="line-label">(Address of Owner)</span>
        <p class="statement">This Certification is being issued upon the request of the above-named applicant for the aforementioned purpose.</p>
        <div>Given this ${escapeHtml(formatGivenThis(normalized.issuedDate))} at Barangay Progreso, City of San Juan, Metro Manila.</div>
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

export function buildConstructionPermitIntakeFormHtml() {
  const permitRows = PERMIT_OPTIONS.map(
    (option) =>
      `<li><span class="checkbox" aria-hidden="true"></span><span class="permit-text">${escapeHtml(option.label)}</span></li>`,
  ).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Construction Permit Intake Form</title>
  <style>
    @page { size: A5 portrait; margin: 8mm; }
    body { font-family: "Times New Roman", serif; margin: 0; color: #111; }
    .sheet { border: 1px solid #222; padding: 12px 14px; min-height: 560px; box-sizing: border-box; }
    .header { text-align: center; line-height: 1.2; margin-bottom: 8px; }
    .title { text-align: center; font-size: 21px; font-weight: 700; margin: 6px 0 3px; }
    .subtitle { text-align: center; font-size: 12px; margin-bottom: 8px; color: #111; }
    .field { margin: 8px 0; }
    .label { font-weight: 700; margin-bottom: 4px; display: block; }
    .line { border: 1px solid #222; min-height: 24px; padding: 5px 8px; }
    ul { margin: 4px 0 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 6px; }
    .checkbox { width: 12px; height: 12px; border: 1px solid #222; display: inline-block; flex: 0 0 12px; }
    .permit-text { line-height: 1.1; }
    .mark-help, .note { font-size: 11px; color: #111; }
    .note { margin-top: 8px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div><strong>BARANGAY PROGRESO</strong></div>
      <div>OFFICE OF THE PUNONG BARANGAY</div>
    </div>
    <div class="title">CONSTRUCTION PERMIT INTAKE FORM</div>
    <div class="subtitle">FOR OCR ISSUANCE</div>
    <div class="field">
      <span class="label">Permit selection</span>
      <div class="mark-help">Put an <strong>X</strong> mark in each applicable box only.</div>
      <ul>${permitRows}</ul>
    </div>
    <div class="field"><span class="label">Others: Please Specify</span><div class="line"></div></div>
    <div class="field"><span class="label">Name of Owner</span><div class="line"></div></div>
    <div class="field"><span class="label">Address of Owner</span><div class="line"></div></div>
    <div class="field"><span class="label">Given this (YYYY-MM-DD)</span><div class="line"></div></div>
    <div class="note">This sheet is for walk-in staff OCR issuance and maps to Construction Permit fields.</div>
  </div>
</body>
</html>`;
}
