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

function splitDate(rawDate: string) {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return {
      day: '',
      month: '',
      year: '',
    };
  }
  return {
    day: String(parsed.getDate()),
    month: parsed.toLocaleString('en-US', { month: 'long' }),
    year: String(parsed.getFullYear()),
  };
}

export function normalizeLuponSummonsFieldMap(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const hearingDateParts = splitDate(resolveField(fields, ['hearingDate']));
  const issuedDateParts = splitDate(resolveField(fields, ['issuedDate', 'dateIssued'], doc.dateIssued));
  const resolvedRespondents = resolveField(fields, ['respondents', 'respondentNames']);
  const respondents = resolvedRespondents || '____________________________';

  return {
    barangayCaseNumber: resolveField(fields, ['barangayCaseNumber', 'caseNumber'], '__________________'),
    dateFiled: resolveField(fields, ['dateFiled', 'filingDate'], '__________'),
    complainants: resolveField(fields, ['complainants', 'complainantNames'], '____________________________'),
    complaintFor: resolveField(fields, ['complaintFor', 'for'], '__________________'),
    respondents,
    summonsTo: resolveField(fields, ['summonsTo', 'to'], resolvedRespondents || doc.residentName || respondents),
    hearingDay: resolveField(fields, ['hearingDay'], hearingDateParts.day || '___'),
    hearingMonth: resolveField(fields, ['hearingMonth'], hearingDateParts.month || '__________'),
    hearingYear: resolveField(fields, ['hearingYear'], hearingDateParts.year || '____'),
    hearingTime: resolveField(fields, ['hearingTime'], '_____'),
    hearingPeriod: resolveField(fields, ['hearingPeriod'], '__________'),
    issuedDay: resolveField(fields, ['issuedDay'], issuedDateParts.day || '___'),
    issuedMonth: resolveField(fields, ['issuedMonth'], issuedDateParts.month || '__________'),
    issuedYear: resolveField(fields, ['issuedYear'], issuedDateParts.year || '____'),
    punongBarangay: resolveField(
      fields,
      ['punongBarangay', 'barangayCaptain', 'captainName'],
      'CESAR JR. H. STO. DOMINGO',
    ),
  };
}

export function buildLuponSummonsPrintableHtml(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const normalized = normalizeLuponSummonsFieldMap(doc, fields);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lupon Summons</title>
  <style>
    @page { size: 8.5in 13in; margin: 0.5in; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: "Times New Roman", serif; color: #111; }
    .page { min-height: 12in; padding: 0; }
    .header-logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 18px;
      margin-bottom: 6px;
    }
    .header-logos img { display: block; object-fit: contain; }
    .logo-progreso, .logo-san-juan { width: 54px; height: 54px; }
    .logo-bagong { width: 74px; height: 60px; }
    .gov-header {
      text-align: center;
      line-height: 1.15;
      margin-bottom: 24px;
      color: #7e965d;
      font-size: 14px;
      font-style: italic;
      font-weight: 700;
    }
    .gov-header .line-city { font-weight: 500; }
    .case-row { display: grid; grid-template-columns: auto 1fr auto 150px; gap: 8px; align-items: end; font-size: 18px; }
    .line { display: inline-block; border-bottom: 1px solid #222; min-height: 24px; padding: 0 6px; text-align: center; }
    .caption { margin-top: 30px; font-size: 20px; }
    .party-row { display: grid; grid-template-columns: 1fr 170px; gap: 18px; align-items: end; }
    .party-line { border-bottom: 1px solid #222; min-height: 28px; padding: 2px 8px; }
    .party-label { text-align: center; }
    .for-row { margin: 10px 0 18px; display: grid; grid-template-columns: 46px 1fr; gap: 8px; align-items: end; max-width: 460px; }
    .against { margin: 12px 0; text-align: center; }
    .title { margin: 32px 0 28px; text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 0.16em; }
    .to { font-size: 20px; line-height: 1.4; }
    .body { margin-top: 26px; font-size: 20px; line-height: 1.75; text-align: justify; }
    .short-line { min-width: 86px; }
    .month-line { min-width: 156px; }
    .time-line { min-width: 110px; }
    .issued { margin-top: 28px; font-size: 20px; }
    .signature { margin-top: 82px; text-align: right; font-size: 22px; }
    .signature .name { display: inline-block; min-width: 300px; border-bottom: 1px solid #222; text-align: center; font-weight: 700; }
    .signature .role { padding-right: 86px; }
    .footer { margin-top: 54px; font-size: 15px; line-height: 1.35; }
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

    <section class="case-row">
      <span>Barangay Case No.</span>
      <span class="line">${escapeHtml(normalized.barangayCaseNumber)}</span>
      <span>Date Filed</span>
      <span class="line">${escapeHtml(normalized.dateFiled)}</span>
    </section>

    <section class="caption">
      <div class="party-row">
        <div class="party-line">${escapeHtml(normalized.complainants)}</div>
        <div class="party-label">Complainant/s</div>
      </div>
      <div class="for-row">
        <span>For</span>
        <span class="line">${escapeHtml(normalized.complaintFor)}</span>
      </div>
      <div class="against">-against-</div>
      <div class="party-row">
        <div class="party-line">${escapeHtml(normalized.respondents)}</div>
        <div class="party-label">Respondent/s</div>
      </div>
    </section>

    <h1 class="title">=S U M M O N S=</h1>

    <section class="to">
      <div>TO:</div>
      <div class="party-row">
        <div class="party-line">${escapeHtml(normalized.summonsTo)}</div>
        <div class="party-label">Respondent/s</div>
      </div>
    </section>

    <section class="body">
      <p>
        You are hereby summoned to appear before me, in person together with your witness on the
        <span class="line short-line">${escapeHtml(normalized.hearingDay)}</span> day of
        <span class="line month-line">${escapeHtml(normalized.hearingMonth)}</span>,
        <span class="line short-line">${escapeHtml(normalized.hearingYear)}</span> at
        <span class="line time-line">${escapeHtml(normalized.hearingTime)}</span> o'clock in the
        <span class="line time-line">${escapeHtml(normalized.hearingPeriod)}</span> then and there to answer
        to a complaint made before me, copy of which is attached hereto, for mediation/conciliation
        of your dispute with complaint/s.
      </p>
      <p>
        You are hereby warned that if you refuse or willfully fail to appear in obedience to this
        summons, you may be barred from the filing any counterclaim arising from said complaint.
      </p>
      <p>FAIL NOT or else face punishment as for contempt of court.</p>
    </section>

    <section class="issued">
      Issued this <span class="line short-line">${escapeHtml(normalized.issuedDay)}</span> day of
      <span class="line month-line">${escapeHtml(normalized.issuedMonth)}</span>,
      <span class="line short-line">${escapeHtml(normalized.issuedYear)}</span>
    </section>

    <section class="signature">
      <div><span class="name">${escapeHtml(normalized.punongBarangay)}</span></div>
      <div class="role">Punong Barangay</div>
    </section>

    <section class="footer">
      <div>#15 M. Cruz Street</div>
      <div>Barangay Progreso, San Juan City</div>
      <div>Email Address: barangayprogreso@yahoo.com</div>
      <div>Telephone Nos. (02)8727-5635 / (02)76258731</div>
    </section>
  </main>
</body>
</html>`;
}

export function buildLuponSummonsIntakeFormHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Lupon Summons Intake Form</title>
  <style>
    @page { size: A5 portrait; margin: 8mm; }
    body { font-family: "Times New Roman", serif; margin: 0; color: #111; }
    .sheet { border: 1px solid #222; padding: 12px 14px; min-height: 560px; box-sizing: border-box; }
    .header { text-align: center; line-height: 1.2; margin-bottom: 8px; }
    .title { text-align: center; font-size: 21px; font-weight: 700; margin: 6px 0 3px; letter-spacing: 0.04em; }
    .subtitle { text-align: center; font-size: 12px; margin-bottom: 8px; color: #2d3b1f; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 8px; }
    .field { display: grid; gap: 3px; }
    .field-full { grid-column: 1 / -1; }
    .label { font-size: 11px; font-weight: 700; }
    .line { border: 1px solid #222; min-height: 21px; border-radius: 4px; padding: 4px 7px; }
    .note { margin-top: 8px; font-size: 10px; color: #2f3a26; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div><strong>BARANGAY PROGRESO</strong></div>
      <div>OFFICE OF THE PUNONG BARANGAY</div>
    </div>
    <div class="title">LUPON SUMMONS INTAKE FORM</div>
    <div class="subtitle">FOR OCR ISSUANCE</div>
    <div class="field-grid">
      <div class="field"><span class="label">Barangay Case Number</span><div class="line"></div></div>
      <div class="field"><span class="label">Date Filed</span><div class="line"></div></div>
      <div class="field field-full"><span class="label">Complainant/s</span><div class="line"></div></div>
      <div class="field"><span class="label">Complaint For</span><div class="line"></div></div>
      <div class="field"><span class="label">Respondent/s</span><div class="line"></div></div>
      <div class="field field-full"><span class="label">Summons To</span><div class="line"></div></div>
      <div class="field"><span class="label">Hearing Day</span><div class="line"></div></div>
      <div class="field"><span class="label">Hearing Month</span><div class="line"></div></div>
      <div class="field"><span class="label">Hearing Year</span><div class="line"></div></div>
      <div class="field"><span class="label">Hearing Time</span><div class="line"></div></div>
      <div class="field"><span class="label">Hearing Period</span><div class="line"></div></div>
      <div class="field"><span class="label">Issued Day</span><div class="line"></div></div>
      <div class="field"><span class="label">Issued Month</span><div class="line"></div></div>
      <div class="field"><span class="label">Issued Year</span><div class="line"></div></div>
      <div class="field field-full"><span class="label">Punong Barangay</span><div class="line"></div></div>
    </div>
    <div class="note">This sheet is for walk-in staff OCR issuance and maps to Lupon Summons fields.</div>
  </div>
</body>
</html>`;
}
