import {
  BARANGAY_CERTIFICATE_TEMPLATE_KEY,
  BUSINESS_PERMIT_TEMPLATE_KEY,
  CONSTRUCTION_PERMIT_TEMPLATE_KEY,
  INDIGENCY_TEMPLATE_KEY,
  LUPON_SUMMONS_TEMPLATE_KEY,
  type OcrTemplateDefinition,
} from '@/lib/ocr/templates';
import {
  OFFICIAL_DOCUMENT_CATEGORIES,
  getCategoryForDocType,
} from '@/lib/documents/document-catalog-constants';

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintSheetHtml(html: string, copies: 2 | 4) {
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html;

  const formMarkup = bodyMatch[1].trim();
  const fourUpBody = `
  <div class="print-grid copies-${copies}">
    ${Array.from({ length: copies }, () => `<div class="form-slot">${formMarkup}</div>`).join('')}
  </div>`;
  const fourUpStyles = `
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    html, body { margin: 0; padding: 0; }
    body { width: 100%; }
    .print-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 4mm;
      width: 100%;
      height: calc(297mm - 16mm);
      box-sizing: border-box;
    }
    .print-grid.copies-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: minmax(0, 1fr);
    }
    .form-slot {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      position: relative;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .form-slot > .sheet {
      min-height: 0 !important;
      transform-origin: top left;
      box-sizing: border-box;
    }
  </style>`;
  const fitScript = `
  <script>
    (() => {
      const fitForms = () => {
        document.querySelectorAll('.form-slot').forEach((slot) => {
          const sheet = slot.querySelector('.sheet');
          if (!sheet) return;
          sheet.style.transform = 'none';
          sheet.style.width = '';
          sheet.style.height = '';
          const widthScale = slot.clientWidth / sheet.scrollWidth;
          const heightScale = slot.clientHeight / sheet.scrollHeight;
          const scale = Math.min(1, widthScale, heightScale);
          sheet.style.transform = 'scale(' + scale + ')';
        });
      };
      window.addEventListener('load', fitForms);
      window.addEventListener('beforeprint', fitForms);
    })();
  </script>`;

  return html
    .replace(/<\/head>/i, `${fourUpStyles}${fitScript}</head>`)
    .replace(bodyMatch[0], `<body>${fourUpBody}</body>`);
}

// 1. Barangay Certification OCR Intake Form
export function buildBarangayCertificationOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'School Requirement / Scholarship (Free)',
    'Indigency / Financial / Medical Assistance (Free)',
    'PWD or Senior Citizen Application (Free)',
    'Health Card Application (Free)',
    'Death Certification (Free)',
    'Employment Application (₱100.00)',
    'Police / NBI / Court Clearance (₱100.00)',
    'Postal ID / Passport / Visa (₱100.00)',
    'Visa Extension / Overseas Employment (₱100.00)',
    'Certificate of No Business Operation (₱200.00)',
    'Transfer of Residence',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barangay Certification - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 6px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
    .reason-text { line-height: 1.15; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>BARANGAY CERTIFICATION &mdash; OCR INTAKE ROUTING SLIP</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang layunin.</div>
    </div>

    <div class="field">
      <span class="label">Resident Full Name (Pangalan ng Residente) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Residence / Postal Address (Tirahan) *</span>
      <div class="line"></div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">Document Requested / Purpose of Certification *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span class="reason-text">${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>

    <div class="field">
      <span class="label">Other: Please Specify (Kung wala sa listahan sa itaas)</span>
      <div class="line"></div>
    </div>
  </div>
</body>
</html>`;
}

// 2. Transient Employees & Worker Certification OCR Intake Form
export function buildTransientWorkersOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'Household Employees (Kasambahay, Driver, Caretaker) (₱100.00)',
    'Company Employees / Staff Personnel (₱100.00)',
    'Construction Workers & Tradesmen (₱100.00)',
    'Agency Contractual Personnel (₱100.00)',
    'Other Transient Workers (₱100.00)',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transient Workers Certification - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr; gap: 5px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>TRANSIENT WORKER CERTIFICATION &mdash; OCR INTAKE FORM</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang kategorya.</div>
    </div>

    <div class="field">
      <span class="label">Worker / Employee Full Name (Pangalan ng Empleyado) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Residence / Employer Address (Tirahan / Opisina ng Employer) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Project / Worksite Location (Kung saan gaganapin / Madedestino) *</span>
      <div class="line"></div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">Worker Category / Type of Employment *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span>${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
}

// 3. Lupon ng mga Tagapamayapa OCR Intake Form
export function buildLuponOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'Summons / Patawag (KP Form #9 - Mediation Hearing)',
    'Notice of Hearing / Reconciliation Notice (KP Form #8)',
    'Certificate to File Action (CFA - KP Form #20)',
    'Lupon Filing Fee / Barangay Dispute Conciliation',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lupon ng mga Tagapamayapa - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr; gap: 5px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE LUPONG TAGAPAMAYAPA</p>
    </div>

    <div class="title-banner">
      <h3>KATARUNGANG PAMBARANGAY &mdash; OCR INTAKE FORM</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang uri ng aksyon.</div>
    </div>

    <div class="field">
      <span class="label">Complainant/s Full Name (Pangalan ng Nagsusumbong / May Reklamo) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Respondent/s Full Name (Pangalan ng Inirereklamo / Respondent) *</span>
      <div class="line"></div>
    </div>

    <div class="grid-2">
      <div class="field">
        <span class="label">Barangay Case No. (Kaso Blg.)</span>
        <div class="line"></div>
      </div>
      <div class="field">
        <span class="label">Date Filed (Petsa ng Reklamo)</span>
        <div class="line"></div>
      </div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">KP Action / Form Requested *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span>${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>

    <div class="field">
      <span class="label">Subject Matter / Nature of Dispute (Tungkol saan ang usapin) *</span>
      <div class="line"></div>
    </div>
  </div>
</body>
</html>`;
}

// 4. Business Clearance OCR Intake Form
export function buildBusinessClearanceOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'New Business Clearance (Bagong Negosyo)',
    'Business Clearance Renewal (Pagpapanibago)',
    'Micro Business (Capital not exceeding ₱20,000.00 - ₱500.00)',
    'Small Business (Capital ₱20,000.00 to ₱200,000.00 - ₱1,000.00)',
    'Medium / Large Business (Capital > ₱200,000.00 - ₱1,500.00)',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Business Clearance - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr; gap: 5px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>BARANGAY BUSINESS CLEARANCE &mdash; OCR INTAKE FORM</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang uri ng negosyo.</div>
    </div>

    <div class="field">
      <span class="label">Business / Establishment Trade Name (Pangalan ng Negosyo) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Owner / Proprietor Full Name (Pangalan ng May-ari / Operator) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Business Location Address (Lugar / Lokasyon ng Negosyo) *</span>
      <div class="line"></div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">Business Category / Application Type *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span>${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
}

// 5. Construction Clearances OCR Intake Form
export function buildConstructionClearancesOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'Construction of a New Structure',
    'Occupancy - Single-Detached House (₱1,000.00)',
    'Occupancy - Apartment / Condominium (₱1,000.00/unit)',
    'Renovation Without Expansion (₱1,000.00)',
    'Renovation With Expansion / Floor Area',
    'Fencing Clearance (₱1,000.00)',
    'Installation of Electric or Communication Posts (₱1,000.00/post)',
    'Manila Water / Utility Excavation (₱1,000.00/point)',
    'Demolition Clearance (₱1,000.00)',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Construction Clearances - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 6px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
    .reason-text { line-height: 1.15; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>CONSTRUCTION CLEARANCE &mdash; OCR INTAKE ROUTING SLIP</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang uri ng clearance.</div>
    </div>

    <div class="field">
      <span class="label">Applicant / Property Owner Full Name (Pangalan ng May-ari) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Project Site Location / Address (Kung saan gaganapin ang proyekto) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Contractor / In-Charge Engineer Name (Pangalan ng Kontratista)</span>
      <div class="line"></div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">Construction / Permit Clearance Type *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span class="reason-text">${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
}

// 6. Delivery & Hauling Clearances OCR Intake Form
export function buildDeliveryHaulingOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'Concrete Pouring Using Concrete Mixer (₱300.00/trip)',
    'Hauling of Debris Using 10-Wheeler Truck (₱1,000.00/day)',
    'Delivery of Filling Materials (Sand/Gravel) (₱1,000.00/day)',
    'Delivery of Heavy Equipment & Fixtures (₱2,000.00/day)',
    'Hauling of Excavated Soil / Materials (₱2,000.00/day)',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Delivery & Hauling Clearances - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr; gap: 5px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>DELIVERY & HAULING CLEARANCE &mdash; OCR INTAKE FORM</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang uri ng kargamento.</div>
    </div>

    <div class="field">
      <span class="label">Hauler / Contractor Full Name (Pangalan ng Naghahakot / Contractor) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Destination / Delivery Address (Lugar ng Pagbababaan sa Barangay) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Vehicle Plate Number / Truck Classification (Plaka ng Truck)</span>
      <div class="line"></div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">Hauling / Delivery Activity *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span>${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
}

// 7. Special & Commercial Permits OCR Intake Form
export function buildSpecialPermitsOcrFormHtml(purposes?: string[]): string {
  const defaultPurposes = [
    'Installation of Wires and Utility Cables (₱1,000.00/street)',
    'Movie, Television, or Commercial Shooting (₱4,000.00/day)',
    'Distribution of Business Flyers & Product Samples (₱1,000.00/day)',
    'Special Event / Promotional Commercial Activity (₱2,000.00)',
    'Other Special Purposes',
  ];
  const list = purposes && purposes.length > 0 ? purposes : defaultPurposes;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Special & Commercial Permits - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; display: block; }
    .line { border: 1px solid #222; height: 26px; background: #fff; }
    .checklist-box { border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0; }
    .checklist-title { font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px; }
    .mark-help { font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic; }
    ul.checklist { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr; gap: 5px; }
    li { font-size: 11px; display: flex; align-items: center; gap: 8px; }
    .checkbox { width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>SPECIAL & COMMERCIAL PERMITS &mdash; OCR INTAKE FORM</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang layunin.</div>
    </div>

    <div class="field">
      <span class="label">Applicant / Production / Company Name (Pangalan ng Aplikante / Kumpanya) *</span>
      <div class="line"></div>
    </div>

    <div class="field">
      <span class="label">Activity Site Location (Kung saan gaganapin ang aktibidad) *</span>
      <div class="line"></div>
    </div>

    <div class="checklist-box">
      <div class="checklist-title">Special Permit Category *</div>
      <div class="mark-help">Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:</div>
      <ul class="checklist">
        ${list.map((r) => `<li><span class="checkbox"></span><span>${escapeHtml(r)}</span></li>`).join('')}
      </ul>
    </div>
  </div>
</body>
</html>`;
}

// Fallback dynamic builder for custom templates added in Admin
export function buildDynamicIntakeFormHtml(template: {
  name: string;
  intakeFields?: Array<{ key: string; label: string; required?: boolean }>;
  purposes?: string[];
}) {
  const title = template.name || 'Official Document Intake Form';
  const fields = (template.intakeFields && template.intakeFields.length > 0)
    ? template.intakeFields
    : [
        { key: 'residentName', label: 'Resident Full Name', required: true },
        { key: 'address', label: 'Resident Address', required: true },
        { key: 'issuedDate', label: 'Date Issued (YYYY-MM-DD)', required: true },
      ];

  const nonPurposeFields = fields.filter((f) => f.key !== 'purpose' && f.key !== 'issuedDate' && f.key !== 'dateIssued' && f.key !== 'date_issued');
  const fieldRows = nonPurposeFields
    .map(
      (f) => `
    <div style="margin-bottom: 8px;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #111; margin-bottom: 2px;">
        ${escapeHtml(f.label)}${f.required ? ' <span>*</span>' : ''}
      </div>
      <div style="border: 1px solid #222; height: 26px; background: #fff;"></div>
    </div>`
    )
    .join('');

  const purposesList = template.purposes || [];
  const checklistHtml = purposesList.length > 0 ? `
    <div style="border: 1.5px solid #222; padding: 8px 12px; background: #fff; margin: 8px 0;">
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: #111; margin-bottom: 2px;">
        Document Requested / Purpose of Request *
      </div>
      <div style="font-size: 10px; color: #444; margin-bottom: 6px; font-style: italic;">
        Lagyan ng ekis (<strong>X</strong>) o checkmark sa loob ng kahon:
      </div>
      <ul style="margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;">
        ${purposesList
          .map(
            (p) =>
              `<li style="font-size: 11px; display: flex; align-items: center; gap: 6px;"><span style="width: 13px; height: 13px; border: 1.5px solid #222; display: inline-block; flex: 0 0 13px; background: #fff;"></span><span style="line-height: 1.15;">${escapeHtml(p)}</span></li>`
          )
          .join('')}
      </ul>
    </div>
    <div style="margin-bottom: 8px;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #111; margin-bottom: 2px;">
        Other Purpose: Please Specify (Kung wala sa listahan sa itaas)
      </div>
      <div style="border: 1px solid #222; height: 26px; background: #fff;"></div>
    </div>
  ` : `
    <div style="margin-bottom: 8px;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #111; margin-bottom: 2px;">
        Purpose of Request *
      </div>
      <div style="border: 1px solid #222; height: 26px; background: #fff;"></div>
    </div>
  `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 12mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 14px 18px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .header p { margin: 1px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 2px 0; font-size: 15px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h3 { margin: 0; font-size: 13px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 10px; color: #333; margin-top: 2px; }
    .fields-container { margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines &bull; City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>${escapeHtml(title)} &mdash; OCR INTAKE ROUTING SLIP</h3>
      <div class="instruction">Isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) at lagyan ng ekis (X) ang layunin.</div>
    </div>

    <div class="fields-container">
      ${fieldRows}
      ${checklistHtml}
    </div>
  </div>
</body>
</html>`;
}

// Master OCR Intake Form Dispatcher covering all 7 official document types
export function buildOcrIntakeFormHtml(
  templateKey: string,
  dynamicTemplate?: (OcrTemplateDefinition | { name?: string; intakeFields?: Array<{ key: string; label: string; required?: boolean }>; purposes?: string[] }) & { purposes?: string[] }
) {
  const normKey = (templateKey || '').toLowerCase();
  const purposes = dynamicTemplate?.purposes;
  let html = '';

  if (normKey.includes('transient') || normKey.includes('worker')) {
    html = buildTransientWorkersOcrFormHtml(purposes);
  } else if (normKey.includes('lupon') || normKey.includes('summons') || normKey.includes('patawag') || normKey.includes('cfa')) {
    html = buildLuponOcrFormHtml(purposes);
  } else if (normKey.includes('business')) {
    html = buildBusinessClearanceOcrFormHtml(purposes);
  } else if (normKey.includes('construction') || normKey.includes('occupancy') || normKey.includes('renovation') || normKey.includes('demolition')) {
    html = buildConstructionClearancesOcrFormHtml(purposes);
  } else if (normKey.includes('delivery') || normKey.includes('hauling')) {
    html = buildDeliveryHaulingOcrFormHtml(purposes);
  } else if (normKey.includes('special') || normKey.includes('commercial')) {
    html = buildSpecialPermitsOcrFormHtml(purposes);
  } else if (normKey.includes('barangay') || normKey.includes('clearance') || normKey.includes('indigency') || normKey.includes('cert')) {
    html = buildBarangayCertificationOcrFormHtml(purposes);
  } else if (dynamicTemplate) {
    html = buildDynamicIntakeFormHtml({
      name: dynamicTemplate.name || 'Official Document',
      intakeFields: dynamicTemplate.intakeFields,
      purposes: dynamicTemplate.purposes,
    });
  } else {
    html = buildBarangayCertificationOcrFormHtml(purposes);
  }

  return buildPrintSheetHtml(html, 2);
}
