const REASON_LABELS = [
  'Application for Employment',
  'Proof of Residency',
  'Medical Assistance',
  'SJ Health Card',
  'Transfer of Residence',
  'Postal ID',
  'School Reference',
  'Burial Assistance',
  'SSS/GSIS/PHILHEALTH',
  'Financial Assistance',
  'SR Citizen ID',
  'Non-Resident',
];

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildBarangayCertificateIntakeFormHtml() {
  const reasons = REASON_LABELS.map(
    (reason) =>
      `<li><span class="checkbox" aria-hidden="true"></span><span class="reason-text">${escapeHtml(reason)}</span></li>`,
  ).join('');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barangay Certificate Intake Form</title>
  <style>
    @page { size: A5 portrait; margin: 10mm; }
    body { font-family: "Times New Roman", serif; margin: 0; color: #111; }
    .sheet { border: 1px solid #222; padding: 14px 16px; min-height: 540px; box-sizing: border-box; }
    .header { text-align: center; line-height: 1.2; margin-bottom: 10px; }
    .title { text-align: center; font-size: 22px; font-weight: 700; margin: 8px 0 10px; }
    .field { margin: 8px 0; }
    .label { font-weight: 700; margin-bottom: 4px; display: block; }
    .line { border: 1px solid #222; min-height: 24px; border-radius: 4px; padding: 5px 8px; }
    ul { margin: 6px 0 0 0; padding: 0; list-style: none; }
    li { margin: 3px 0; font-size: 12px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 12px; height: 12px; border: 1px solid #222; display: inline-block; flex: 0 0 12px; }
    .reason-text { line-height: 1.1; }
    .note { margin-top: 8px; font-size: 11px; color: #2f3a26; }
    .mark-help { font-size: 11px; margin-top: 2px; color: #2f3a26; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div><strong>BARANGAY PROGRESO</strong></div>
      <div>OFFICE OF THE PUNONG BARANGAY</div>
    </div>
    <div class="title">BARANGAY CERTIFICATE INTAKE FORM (FOR OCR)</div>
    <div class="field"><span class="label">This is to certify that</span><div class="line"></div></div>
    <div class="field"><span class="label">is a bonafide resident of</span><div class="line"></div></div>
    <div class="field">
      <span class="label">Marked reason(s)</span>
      <div class="mark-help">Put an <strong>X</strong> mark in the box only.</div>
      <ul>${reasons}</ul>
    </div>
    <div class="field"><span class="label">Other: Please Specify</span><div class="line"></div></div>
    <div class="field"><span class="label">Given this (YYYY-MM-DD)</span><div class="line"></div></div>
    <div class="note">This sheet is for walk-in staff OCR issuance and maps to Barangay Certificate fields.</div>
  </div>
</body>
</html>`;
}
