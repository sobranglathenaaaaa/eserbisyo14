export const BARANGAY_CERTIFICATE_REASON_LABELS = [
  'Barangay Certification (General)',
  'Certificate of Indigency',
  'Certificate of Residency',
  'Certificate of Good Moral Character',
  'Application for Employment',
  'School Requirement / Scholarship',
  'PWD / Senior Citizen Application',
  'SJ Health Card / Medical Clearance',
  'Police / NBI / Court Clearance',
  'Postal ID / Passport / Visa',
  'Burial Assistance',
  'SSS / GSIS / PhilHealth',
  'Financial Assistance',
  'Medical Assistance',
  'Transfer of Residence',
  'Certificate of No Operation',
  'Non-Resident',
] as const;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface BarangayCertificateIntakeFormOptions {
  barangayName?: string;
  officeTitle?: string;
}

export function buildBarangayCertificateIntakeFormHtml(options?: BarangayCertificateIntakeFormOptions) {
  const barangayName = options?.barangayName || 'BARANGAY PROGRESO';
  const officeTitle = options?.officeTitle || 'OFFICE OF THE PUNONG BARANGAY';

  const reasons = BARANGAY_CERTIFICATE_REASON_LABELS.map(
    (reason) =>
      `<li><span class="checkbox" aria-hidden="true"></span><span class="reason-text">${escapeHtml(reason)}</span></li>`,
  ).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barangay Certification Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 15mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 18px 24px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
    .header p { margin: 2px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .header h2 { margin: 4px 0; font-size: 16px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 8px; text-align: center; margin-bottom: 14px; }
    .title-banner h3 { margin: 0; font-size: 15px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 11px; color: #111; margin-top: 3px; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #111; margin-bottom: 4px; display: block; }
    .line { border: 1px solid #222; min-height: 28px; background: #fff; }
    .checklist-container { border: 1px solid #222; padding: 10px 14px; background: #fff; margin: 12px 0; }
    .checklist-title { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 11px; color: #111; margin-bottom: 8px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    li { font-size: 12px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 14px; height: 14px; border: 1px solid #222; display: inline-block; flex: 0 0 14px; background: #fff; }
    .reason-text { line-height: 1.2; font-size: 12px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines</p>
      <p style="font-weight: bold;">City of San Juan</p>
      <h2>${escapeHtml(barangayName)}</h2>
      <p style="font-weight: bold;">${escapeHtml(officeTitle)}</p>
    </div>

    <div class="title-banner">
      <h3>BARANGAY CERTIFICATION &mdash; OCR INTAKE ROUTING SLIP</h3>
      <div class="instruction">Mangyaring isulat nang MALINAW at PATAPOS (ALL CAPS) at lagyan ng tsek (X) ang kailangang dokumento.</div>
    </div>

    <div class="field"><span class="label">This is to certify that (Resident Full Name) *</span><div class="line"></div></div>
    <div class="field"><span class="label">is a bonafide resident of (Resident Address) *</span><div class="line"></div></div>

    <div class="checklist-container">
      <div class="checklist-title">Document Requested / Purpose of Certification *</div>
      <div class="mark-help">Put an <strong>X</strong> mark inside the box for the requested document:</div>
      <ul class="checklist">${reasons}</ul>
    </div>

    <div class="field"><span class="label">Other: Please Specify (Kung wala sa listahan)</span><div class="line"></div></div>
    <div class="field"><span class="label">Given this / Date Issued (YYYY-MM-DD) *</span><div class="line"></div></div>
  </div>
</body>
</html>`;
}
