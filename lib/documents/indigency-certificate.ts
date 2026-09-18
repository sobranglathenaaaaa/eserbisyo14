export type CertificateFieldMap = Record<string, string>;

export function parseCertificateFieldsFromQrPayload(qrPayload: string): CertificateFieldMap {
  try {
    const parsed = JSON.parse(qrPayload) as { parsedFields?: unknown; metadata?: { parsedFields?: unknown } };
    const candidate =
      (parsed?.parsedFields && typeof parsed.parsedFields === 'object' ? parsed.parsedFields : null) ??
      (parsed?.metadata?.parsedFields && typeof parsed.metadata.parsedFields === 'object'
        ? parsed.metadata.parsedFields
        : null);

    if (!candidate || Array.isArray(candidate)) return {};
    return Object.entries(candidate as Record<string, unknown>).reduce<CertificateFieldMap>((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? value : value == null ? '' : String(value);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function resolveCertificateField(fields: CertificateFieldMap, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = fields[key];
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

function splitIssuedDate(issuedDate: string) {
  const parsed = new Date(issuedDate);
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

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeIndigencyFieldMap(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const residentName = resolveCertificateField(fields, ['residentName', 'name', 'fullName'], doc.residentName).trim();
  const address = resolveCertificateField(
    fields,
    ['address', 'residenceAddress', 'streetAddress'],
    '____________________________',
  ).trim();
  const requestedBy = resolveCertificateField(fields, ['requestedBy', 'requestorName', 'mrMrsMs'], residentName).trim();
  const issuedDate =
    resolveCertificateField(fields, ['issuedDate', 'dateIssued'], doc.dateIssued).trim() || doc.dateIssued;

  const fromSplitFields = {
    day: resolveCertificateField(fields, ['issuedDay'], ''),
    month: resolveCertificateField(fields, ['issuedMonth'], ''),
    year: resolveCertificateField(fields, ['issuedYear'], ''),
  };
  const fromDate = splitIssuedDate(issuedDate);

  return {
    residentName,
    address,
    requestedBy,
    issuedDate,
    issuedDay: fromSplitFields.day || fromDate.day || '___',
    issuedMonth: fromSplitFields.month || fromDate.month || '__________',
    issuedYear: fromSplitFields.year || fromDate.year || '____',
  };
}

export function toIndigencyDocxTemplateData(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const normalized = normalizeIndigencyFieldMap(doc, fields);
  return {
    residentName: normalized.residentName,
    address: normalized.address,
    requestedBy: normalized.requestedBy,
    issuedDay: normalized.issuedDay,
    issuedMonth: normalized.issuedMonth,
    issuedYear: normalized.issuedYear,
  };
}

export function buildIndigencyPrintableHtml(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  const normalized = normalizeIndigencyFieldMap(doc, fields);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate of Indigency</title>
  <style>
    @page { size: A4 portrait; margin: 18mm; }
    body { font-family: "Times New Roman", serif; margin: 0; color: #111; }
    .sheet { border: 1px solid #222; padding: 20px 24px; min-height: 1020px; box-sizing: border-box; position: relative; }
    .header { text-align: center; line-height: 1.3; margin-bottom: 14px; }
    .header .country { font-weight: bold; color: #8ea065; letter-spacing: 0.04em; }
    .title { text-align: center; font-size: 40px; letter-spacing: 0.05em; font-weight: bold; margin: 20px 0 26px; }
    .body { font-size: 29px; line-height: 1.75; }
    .line { border-bottom: 1px solid #222; min-width: 180px; display: inline-block; padding: 0 6px; }
    .spacer { height: 18px; }
    .signature { margin-top: 70px; text-align: right; }
    .signature .name { font-size: 33px; font-weight: bold; }
    .signature .role { font-size: 30px; }
    .footer-note { margin-top: 80px; font-size: 22px; color: #4e5a31; font-weight: bold; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="country">REPUBLIC OF THE PHILIPPINES</div>
      <div>City Of San Juan</div>
      <div><strong>BARANGAY PROGRESO</strong></div>
      <div><strong>OFFICE OF THE PUNONG BARANGAY</strong></div>
    </div>

    <div class="title">CERTIFICATE OF INDIGENCY</div>

    <div class="body">
      <div>TO WHOM IT MAY CONCERN:</div>
      <div class="spacer"></div>
      <div>
        This is to certify that <span class="line">${escapeHtml(normalized.residentName)}</span>
        whose residence at <span class="line">${escapeHtml(normalized.address)}</span>
        is within the jurisdiction of Brgy. Progreso, City of San Juan and belongs to the indigent families of this barangay.
      </div>
      <div class="spacer"></div>
      <div>
        This certification is being issued upon the request of
        Mr./Mrs./Ms <span class="line">${escapeHtml(normalized.requestedBy)}</span>
        for whatever legal purpose it may serve him/her.
      </div>
      <div class="spacer"></div>
      <div>
        Issued this <span class="line">${escapeHtml(normalized.issuedDay)}</span> day of
        <span class="line">${escapeHtml(normalized.issuedMonth)}, ${escapeHtml(normalized.issuedYear)}</span>.
      </div>
    </div>

    <div class="signature">
      <div class="name">CESAR JR. H. STO. DOMINGO</div>
      <div class="role">Punong Barangay</div>
    </div>

    <div class="footer-note">Not Valid Without Official Seal</div>
  </div>
</body>
</html>`;
}

export function buildIndigencyIntakeFormHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate of Indigency Intake Form</title>
  <style>
    @page { size: A5 portrait; margin: 10mm; }
    body { font-family: "Times New Roman", serif; margin: 0; color: #111; }
    .sheet { border: 1px solid #222; padding: 14px 16px; min-height: 540px; box-sizing: border-box; position: relative; }
    .header { text-align: center; line-height: 1.2; margin-bottom: 10px; }
    .header .country { font-weight: bold; color: #8ea065; letter-spacing: 0.04em; }
    .title { text-align: center; font-size: 23px; letter-spacing: 0.05em; font-weight: bold; margin: 10px 0 8px; }
    .subtitle { text-align: center; font-size: 12px; margin-bottom: 10px; color: #2d3b1f; }
    .body { font-size: 12px; line-height: 1.35; }
    .field-grid { display: grid; gap: 8px; margin-top: 8px; }
    .field { display: grid; gap: 6px; }
    .field label { font-weight: bold; }
    .line { border: 1px solid #222; min-height: 24px; border-radius: 4px; padding: 5px 8px; }
    .note { margin-top: 8px; font-size: 11px; color: #2f3a26; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="country">REPUBLIC OF THE PHILIPPINES</div>
      <div>City Of San Juan</div>
      <div><strong>BARANGAY PROGRESO</strong></div>
      <div><strong>OFFICE OF THE PUNONG BARANGAY</strong></div>
    </div>

    <div class="title">CERTIFICATE OF INDIGENCY</div>
    <div class="subtitle">INTAKE FORM (FOR OCR ISSUANCE)</div>

    <div class="body">
      <div>Please write in PRINT letters. OCR reads labels below.</div>
      <div class="field-grid">
        <div class="field">
          <label>This is to certify that</label>
          <div class="line">&nbsp;</div>
        </div>
        <div class="field">
          <label>whose residence at</label>
          <div class="line">&nbsp;</div>
        </div>
        <div class="field">
          <label>issued upon the request of Mr./Mrs./Ms</label>
          <div class="line">&nbsp;</div>
        </div>
        <div class="field">
          <label>Date to issue (YYYY-MM-DD)</label>
          <div class="line">&nbsp;</div>
        </div>
      </div>
      <div class="note">This sheet is for walk-in staff OCR issuance only and is separate from the final printable certificate.</div>
    </div>
  </div>
</body>
</html>`;
}
