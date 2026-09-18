import fs from 'node:fs/promises';
import path from 'node:path';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import PizZip from 'pizzip';

const cwd = process.cwd();

const templateCandidates = [
  path.join(cwd, 'template', 'certificate-indigency.docx'),
  path.join(cwd, 'templates', 'certificate-indigency.docx'),
  path.join(cwd, 'template', 'BLANK-INDIGENCY-WITH-NEW-LOGO-KIM.docx'),
];

async function resolveTemplatePath() {
  for (const candidate of templateCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue candidate scan.
    }
  }
  throw new Error('No DOCX template found. Expected template/certificate-indigency.docx.');
}

function splitIssuedDate(issuedDate) {
  const parsed = new Date(issuedDate);
  if (Number.isNaN(parsed.getTime())) {
    return { day: '___', month: '__________', year: '____' };
  }
  return {
    day: String(parsed.getDate()),
    month: parsed.toLocaleString('en-US', { month: 'long' }),
    year: String(parsed.getFullYear()),
  };
}

function wrapPrintableHtml(bodyHtml) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate of Indigency - Simulated OCR Result</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body { margin: 0; font-family: "Times New Roman", serif; color: #111; background: #fff; }
    main { max-width: 900px; margin: 0 auto; }
    p { margin: 0 0 0.9em; line-height: 1.35; }
    table { border-collapse: collapse; width: 100%; }
    td, th { vertical-align: top; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyLegacyIndigencyFallbackHtml(html, data) {
  const residentName = escapeHtml(data.residentName);
  const address = escapeHtml(data.address);
  const requestedBy = escapeHtml(data.requestedBy);
  const issuedDay = escapeHtml(data.issuedDay);
  const issuedMonth = escapeHtml(data.issuedMonth);
  const issuedYear = escapeHtml(data.issuedYear);

  const alreadyFilled =
    html.includes(residentName) &&
    html.includes(address) &&
    html.includes(requestedBy) &&
    html.includes(issuedYear);
  if (alreadyFilled) return html;

  let patched = html;
  patched = patched.replace(
    /<p>([\s\S]*?This is to certify that)[\s\S]*?<\/p>/i,
    `<p>$1 <strong>${residentName}</strong></p>`,
  );
  patched = patched.replace(
    /whose residence at[\s\S]*?<strong>\s*<\/strong>\s*is within/i,
    `whose residence at <strong>${address}</strong> is within`,
  );
  patched = patched.replace(
    /Mr\.\/Mrs\.\/Ms[\s\S]*?<strong>\s*<\/strong>\s*for whatever legal purpose/i,
    `Mr./Mrs./Ms <strong>${requestedBy}</strong> for whatever legal purpose`,
  );
  patched = patched.replace(
    /Issued this[\s_]*day of[\s_]*<strong>,\s*<\/strong>\s*\d{4}/i,
    `Issued this <strong>${issuedDay}</strong> day of <strong>${issuedMonth}</strong>, <strong>${issuedYear}</strong>`,
  );
  return patched;
}

async function run() {
  const issuedDate = '2026-04-23';
  const issued = splitIssuedDate(issuedDate);

  const simulatedOcrParsedFields = {
    residentName: 'JUAN DELA CRUZ',
    address: '15 M. Cruz Street, Barangay Progreso, San Juan City',
    requestedBy: 'JUAN DELA CRUZ',
    issuedDate,
  };

  const docxData = {
    residentName: simulatedOcrParsedFields.residentName,
    address: simulatedOcrParsedFields.address,
    requestedBy: simulatedOcrParsedFields.requestedBy,
    issuedDay: issued.day,
    issuedMonth: issued.month,
    issuedYear: issued.year,
  };

  const templatePath = await resolveTemplatePath();
  const templateBuffer = await fs.readFile(templatePath);
  const zip = new PizZip(templateBuffer);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  document.render(docxData);

  const filledDocxBuffer = document.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  const converted = await mammoth.convertToHtml({ buffer: filledDocxBuffer });
  const htmlWithFallback = applyLegacyIndigencyFallbackHtml(converted.value, docxData);
  const printableHtml = wrapPrintableHtml(htmlWithFallback);

  const outputDir = path.join(cwd, 'tmp', 'ocr-simulation');
  await fs.mkdir(outputDir, { recursive: true });

  const htmlPath = path.join(outputDir, 'certificate-preview.html');
  const jsonPath = path.join(outputDir, 'simulated-ocr-output.json');

  await fs.writeFile(htmlPath, printableHtml, 'utf8');
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        scenario: 'Resident filled intake form -> staff OCR scan -> generated certificate',
        templatePath,
        parsedFields: simulatedOcrParsedFields,
        docxData,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Generated preview HTML: ${htmlPath}`);
  console.log(`Saved simulated OCR JSON: ${jsonPath}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
