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
  const resolvedRespondents = resolveField(fields, ['respondents', 'respondentNames', 'respondentName']);
  const resolvedComplainants = resolveField(fields, ['complainants', 'complainantNames', 'complainantName']);

  return {
    docType: resolveField(fields, ['docType', 'documentType', 'subType', 'templateKey', 'typeLabel']),
    barangayCaseNumber: resolveField(fields, ['barangayCaseNumber', 'caseNumber']),
    dateFiled: resolveField(fields, ['dateFiled', 'filingDate']),
    complainants: resolvedComplainants || doc.residentName || '',
    complaintFor: resolveField(fields, ['complaintFor', 'for', 'purpose', 'reason']),
    respondents: resolvedRespondents || '',
    summonsTo: resolveField(fields, ['summonsTo', 'to'], resolvedRespondents || ''),
    hearingDay: resolveField(fields, ['hearingDay'], hearingDateParts.day),
    hearingMonth: resolveField(fields, ['hearingMonth'], hearingDateParts.month),
    hearingYear: resolveField(fields, ['hearingYear'], hearingDateParts.year || '2026'),
    hearingTime: resolveField(fields, ['hearingTime']),
    hearingPeriod: resolveField(fields, ['hearingPeriod'], 'AM'),
    issuedDay: resolveField(fields, ['issuedDay'], issuedDateParts.day),
    issuedMonth: resolveField(fields, ['issuedMonth'], issuedDateParts.month),
    issuedYear: resolveField(fields, ['issuedYear'], issuedDateParts.year || '2026'),
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

  const combinedType = `${normalized.docType} ${doc.residentName} ${normalized.complaintFor}`.toLowerCase();
  const isCfa = combinedType.includes('cfa') || combinedType.includes('certificate to file action');
  const isHearingNotice = !isCfa && (combinedType.includes('reconciliation') || combinedType.includes('notice of hearing') || combinedType.includes('abiso'));

  let titleHtml = '= S U M M O N S =';
  let subtitleHtml = '(KP FORM #9 - PATAWAG)';
  if (isCfa) {
    titleHtml = 'CERTIFICATE TO FILE ACTION';
    subtitleHtml = '(KP FORM #20 - KATIBAYAN UPANG MAKADULOG SA HUKUMAN)';
  } else if (isHearingNotice) {
    titleHtml = 'NOTICE OF HEARING / RECONCILIATION NOTICE';
    subtitleHtml = '(KP FORM #8 - ABISO NG PAGDINIG)';
  }

  const complainantsDisplay = normalized.complainants ? escapeHtml(normalized.complainants) : '&nbsp;';
  const respondentsDisplay = normalized.respondents ? escapeHtml(normalized.respondents) : '&nbsp;';
  const caseNoDisplay = normalized.barangayCaseNumber ? escapeHtml(normalized.barangayCaseNumber) : '&nbsp;';
  const dateFiledDisplay = normalized.dateFiled ? escapeHtml(normalized.dateFiled) : escapeHtml(doc.dateIssued || new Date().toISOString().slice(0, 10));
  const forDisplay = normalized.complaintFor ? escapeHtml(normalized.complaintFor) : '&nbsp;';

  const hearingDayVal = normalized.hearingDay ? escapeHtml(normalized.hearingDay) : '&nbsp;&nbsp;&nbsp;&nbsp;';
  const hearingMonthVal = normalized.hearingMonth ? escapeHtml(normalized.hearingMonth) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  const hearingYearVal = normalized.hearingYear ? escapeHtml(normalized.hearingYear) : '2026';
  const hearingTimeVal = normalized.hearingTime ? escapeHtml(normalized.hearingTime) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  const hearingPeriodVal = normalized.hearingPeriod ? escapeHtml(normalized.hearingPeriod) : 'AM';

  const issuedDayVal = normalized.issuedDay ? escapeHtml(normalized.issuedDay) : '&nbsp;&nbsp;&nbsp;&nbsp;';
  const issuedMonthVal = normalized.issuedMonth ? escapeHtml(normalized.issuedMonth) : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  const issuedYearVal = normalized.issuedYear ? escapeHtml(normalized.issuedYear) : '2026';

  let bodyHtml = '';
  if (isCfa) {
    bodyHtml = `
      <div style="margin: 20px 0 28px 0; font-size: 16px; line-height: 2.1; text-align: justify;">
        <p style="font-weight: bold; margin-bottom: 14px;">This is to certify that:</p>
        <ol style="margin: 0 0 24px 28px; padding: 0; line-height: 2.2;">
          <li style="margin-bottom: 10px;">There has been a personal confrontation between the parties before the Punong Barangay / Lupon Tagapamayapa;</li>
          <li style="margin-bottom: 10px;">A mediation/conciliation was attempted in good faith, but <strong>NO SETTLEMENT / CONCILIATION</strong> was reached;</li>
          <li style="margin-bottom: 10px;">Therefore, the corresponding complaint for the dispute may now be formally filed in Court (MTC/RTC) or Prosecutor's Office.</li>
        </ol>
      </div>`;
  } else if (isHearingNotice) {
    bodyHtml = `
      <div style="margin: 18px 0 24px 0; font-size: 16px; line-height: 2.0; text-align: justify;">
        <div style="margin-bottom: 16px;">
          <span style="font-weight: bold;">TO: </span>
          <span class="field-line" style="min-width: 320px; font-weight: bold;">${complainantsDisplay} & ${respondentsDisplay}</span>
          <div style="font-size: 12px; color: #444; margin-left: 36px;">(Parties / Complainant and Respondent)</div>
        </div>
        <p style="text-indent: 40px; margin-bottom: 16px;">
          You are hereby required to appear before the undersigned at the Barangay Hall on the
          <span class="field-line inline-line" style="min-width: 50px;">${hearingDayVal}</span> day of
          <span class="field-line inline-line" style="min-width: 120px;">${hearingMonthVal}</span>,
          <span class="field-line inline-line" style="min-width: 60px;">${hearingYearVal}</span> at
          <span class="field-line inline-line" style="min-width: 70px;">${hearingTimeVal}</span> o'clock in the
          <span class="field-line inline-line" style="min-width: 50px;">${hearingPeriodVal}</span> for a conciliation and mediation hearing of the above-entitled case.
        </p>
        <p style="text-indent: 40px; margin-bottom: 16px;">
          Please be present on time with all relevant supporting documents and witnesses.
        </p>
      </div>`;
  } else {
    // Summons (KP Form #9)
    bodyHtml = `
      <div style="margin: 18px 0 24px 0; font-size: 16px; line-height: 2.0; text-align: justify;">
        <div style="margin-bottom: 16px;">
          <span style="font-weight: bold;">TO: </span>
          <span class="field-line" style="min-width: 320px; font-weight: bold;">${respondentsDisplay}</span>
          <div style="font-size: 12px; color: #444; margin-left: 36px;">Respondent/s</div>
        </div>
        <p style="text-indent: 40px; margin-bottom: 16px;">
          You are hereby summoned to appear before me, in person together with your witness on the
          <span class="field-line inline-line" style="min-width: 50px;">${hearingDayVal}</span> day of
          <span class="field-line inline-line" style="min-width: 120px;">${hearingMonthVal}</span>,
          <span class="field-line inline-line" style="min-width: 60px;">${hearingYearVal}</span> at
          <span class="field-line inline-line" style="min-width: 70px;">${hearingTimeVal}</span> o'clock in the
          <span class="field-line inline-line" style="min-width: 50px;">${hearingPeriodVal}</span> then and there to answer
          to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.
        </p>
        <p style="text-indent: 40px; margin-bottom: 16px;">
          You are hereby warned that if you refuse or willfully fail to appear in obedience to this
          summons, you may be barred from the filing any counterclaim arising from said complaint.
        </p>
        <p style="font-weight: bold; margin-bottom: 20px;">FAIL NOT or else face punishment as for contempt of court.</p>
      </div>`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(titleHtml)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: "Times New Roman", Georgia, serif; color: #111; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; position: relative; }
    .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.08; pointer-events: none; z-index: 0; }
    .watermark img { width: 440px; height: 440px; object-fit: contain; }
    .content-layer { position: relative; z-index: 1; }
    .header-logos { display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 4px; }
    .header-logos img { display: block; object-fit: contain; }
    .logo-progreso, .logo-san-juan { width: 56px; height: 56px; }
    .logo-bagong { width: 76px; height: 60px; }
    .gov-header { text-align: center; line-height: 1.2; margin-bottom: 16px; color: #7e965d; font-size: 13.5px; font-style: italic; font-weight: bold; }
    .gov-header .line-city { font-weight: normal; }
    .caption-box { border: 1.5px solid #000; padding: 14px 18px; margin: 10px 0 20px 0; background: transparent; }
    .caption-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; font-size: 13.5px; }
    .field-line { display: inline-block; border-bottom: 1.5px solid #000; padding: 0 4px 1px 4px; min-height: 20px; vertical-align: bottom; }
    .inline-line { text-align: center; font-weight: bold; }
    .doc-title-block { text-align: center; margin: 24px 0 16px 0; }
    .doc-title { font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; color: #000; text-transform: uppercase; }
    .doc-subtitle { font-size: 12px; font-weight: bold; color: #475569; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .issued-block { margin-top: 20px; font-size: 15.5px; }
    .signature-block { margin-top: 40px; display: flex; justify-content: flex-end; }
    .signature-box { text-align: center; min-width: 260px; }
    .signature-name { font-size: 15px; font-weight: bold; text-decoration: underline; margin: 0; text-transform: uppercase; }
    .signature-role { font-size: 12px; font-weight: bold; margin-top: 3px; }
    .footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 11.5px; font-style: italic; color: #4f6e34; font-weight: bold; line-height: 1.4; }
  </style>
</head>
<body>
  <main class="page">
    <div class="watermark" aria-hidden="true">
      <img src="/images/indigency-template/barangay-progreso-seal.jpeg" alt="" />
    </div>

    <div class="content-layer">
      <!-- 3 SEALS HEADER -->
      <section class="header-logos" aria-hidden="true">
        <img class="logo-progreso" src="/images/indigency-template/barangay-progreso-seal.jpeg" alt="Barangay Seal" />
        <img class="logo-san-juan" src="/images/indigency-template/san-juan-seal.jpeg" alt="City Seal" />
        <img class="logo-bagong" src="/images/indigency-template/bagong-pilipinas.png" alt="Bagong Pilipinas" />
      </section>
      <section class="gov-header">
        <div>REPUBLIC OF THE PHILIPPINES</div>
        <div class="line-city">City Of San Juan</div>
        <div>BARANGAY PROGRESO</div>
        <div>OFFICE OF THE PUNONG BARANGAY</div>
      </section>

      <!-- CAPTION BOX (NO DOUBLED LINES) -->
      <section class="caption-box">
        <div class="caption-grid">
          <!-- LEFT: COMPLAINANT VS RESPONDENT -->
          <div>
            <div class="field-line" style="width: 100%; font-weight: bold;">${complainantsDisplay}</div>
            <div style="font-size: 11px; text-align: center; color: #444; margin-top: 2px;">Complainant/s</div>

            <div style="text-align: center; font-weight: bold; margin: 8px 0; font-size: 12.5px; letter-spacing: 1px;">- against -</div>

            <div class="field-line" style="width: 100%; font-weight: bold;">${respondentsDisplay}</div>
            <div style="font-size: 11px; text-align: center; color: #444; margin-top: 2px;">Respondent/s</div>
          </div>

          <!-- RIGHT: CASE NO, DATE FILED, FOR -->
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
            <div style="display: flex; align-items: flex-end; gap: 6px;">
              <span style="font-weight: bold; white-space: nowrap;">Barangay Case No.:</span>
              <span class="field-line" style="flex: 1; font-weight: bold;">${caseNoDisplay}</span>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 6px;">
              <span style="font-weight: bold; white-space: nowrap;">Date Filed:</span>
              <span class="field-line" style="flex: 1; font-weight: bold;">${dateFiledDisplay}</span>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 6px;">
              <span style="font-weight: bold; white-space: nowrap;">For:</span>
              <span class="field-line" style="flex: 1; font-weight: bold;">${forDisplay}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TITLE -->
      <section class="doc-title-block">
        <h1 class="doc-title">${titleHtml}</h1>
        <div class="doc-subtitle">${subtitleHtml}</div>
      </section>

      <!-- BODY -->
      <section class="body-section">
        ${bodyHtml}
      </section>

      <!-- ISSUED DATE -->
      <section class="issued-block">
        Issued this
        <span class="field-line inline-line" style="min-width: 45px;">${issuedDayVal}</span> day of
        <span class="field-line inline-line" style="min-width: 110px;">${issuedMonthVal}</span>,
        <span class="field-line inline-line" style="min-width: 60px;">${issuedYearVal}</span>.
      </section>

      <!-- SIGNATURE -->
      <section class="signature-block">
        <div class="signature-box">
          <p class="signature-name">${escapeHtml(normalized.punongBarangay)}</p>
          <p class="signature-role">Punong Barangay / Lupon Chairman</p>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="footer">
        <div>#15 M. Cruz Street Barangay Progreso, San Juan City</div>
        <div>Email Address: <span style="text-decoration: underline;">barangayprogreso@yahoo.com</span> | Telephone Nos. (02)8727-5635 / (02)76258731</div>
      </footer>
    </div>
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
