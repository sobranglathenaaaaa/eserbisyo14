import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assertTemplateFile(relativePath) {
  assert.ok(fs.existsSync(path.join(rootDir, relativePath)), `${relativePath} must exist for OCR printable rendering`);
}

function loadTypeScriptModule(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} };
  const sandbox = {
    exports: module.exports,
    module,
    require,
  };
  vm.runInNewContext(transpiled.outputText, sandbox, { filename: filePath });
  return module.exports;
}

const templates = loadTypeScriptModule('lib/ocr/templates.ts');

assertTemplateFile('template/BUSINESS-PERMIT.docx');
assertTemplateFile('template/CONSTRUCTION-PERMIT.docx');
assertTemplateFile('template/BLANK-LUPON-SUMMONS-KP2026.docx');
assertTemplateFile('template/BLANK-BARANGAY-CERT-NEW-LOGO-doc.docx');
assertTemplateFile('template/BLANK-INDIGENCY-WITH-NEW-LOGO-KIM.docx');

const business = templates.getOcrTemplateByKey('business_permit');
assert.ok(business, 'business_permit template must be registered');
assert.deepEqual(
  Array.from(business.requiredFields),
  ['establishmentName', 'ownerName', 'postalAddress', 'issuedDate'],
  'business permit required fields must match the printable form',
);
assert.deepEqual(
  Array.from(templates.getMissingRequiredTemplateFields('business_permit', {
    establishmentName: 'Progreso Sari-Sari Store',
    ownerName: 'Juan Dela Cruz',
    postalAddress: '15 M. Cruz Street, San Juan City',
    issuedDate: '2026-05-09',
  })),
  [],
  'business permit should accept complete OCR fields',
);
assert.equal(
  templates.isTemplateCompatibleWithDocumentType('business_permit', 'Capital up to 20,000', 'Business Clearances'),
  true,
  'business permit must match Business Clearances category',
);
assert.equal(
  templates.resolveTemplateForDocumentType('Capital above 200,000', 'Business Clearances')?.key,
  'business_permit',
  'business document types should resolve to the business permit template',
);

const lupon = templates.getOcrTemplateByKey('lupon_summons');
assert.ok(lupon, 'lupon_summons template must be registered');
assert.deepEqual(
  Array.from(lupon.requiredFields),
  [
    'barangayCaseNumber',
    'dateFiled',
    'complainants',
    'complaintFor',
    'respondents',
    'summonsTo',
    'hearingDay',
    'hearingMonth',
    'hearingYear',
    'hearingTime',
    'hearingPeriod',
    'issuedDay',
    'issuedMonth',
    'issuedYear',
  ],
  'lupon summons required fields must match the summons form blanks',
);
assert.deepEqual(
  Array.from(templates.getMissingRequiredTemplateFields('lupon_summons', {
    barangayCaseNumber: '2026-001',
    dateFiled: '2026-05-21',
    complainants: 'Maria Santos',
    complaintFor: 'Mediation',
    respondents: 'Juan Dela Cruz',
    summonsTo: 'Juan Dela Cruz',
    hearingDay: '30',
    hearingMonth: 'May',
    hearingYear: '2026',
    hearingTime: '9:00',
    hearingPeriod: 'morning',
    issuedDay: '21',
    issuedMonth: 'May',
    issuedYear: '2026',
  })),
  [],
  'lupon summons should accept complete OCR fields',
);
assert.equal(
  templates.isTemplateCompatibleWithDocumentType('lupon_summons', 'Lupon Filing Fee', 'Lupon ng mga Tagapamayapa'),
  true,
  'lupon summons must match the Lupon filing document type',
);
assert.equal(
  templates.resolveTemplateForDocumentType('Lupon Filing Fee', 'Lupon ng mga Tagapamayapa')?.key,
  'lupon_summons',
  'lupon filing document types should resolve to the lupon summons template',
);

const construction = templates.getOcrTemplateByKey('construction_permit');
assert.ok(construction, 'construction_permit template must be registered');
assert.deepEqual(
  Array.from(construction.requiredFields),
  ['ownerName', 'ownerAddress', 'permitSelection', 'issuedDate'],
  'construction permit required fields must include owner, selection, and date',
);
assert.equal(
  templates.getMissingRequiredTemplateFields('construction_permit', {
    ownerName: 'Maria Santos',
    ownerAddress: '21 P. Guevarra Street, San Juan City',
    permitBuilding: 'true',
    issuedDate: '2026-05-09',
  }).includes('permitSelection'),
  false,
  'construction permit should accept one marked permit choice',
);
assert.equal(
  templates.isTemplateCompatibleWithDocumentType('construction_permit', 'Occupancy - Single Detach', 'Construction Clearances'),
  true,
  'construction permit must match Construction Clearances category',
);
assert.equal(
  templates.resolveTemplateForDocumentType('Demolition - Single Detach', 'Construction Clearances')?.key,
  'construction_permit',
  'construction document types should resolve to the construction permit template',
);

console.log('OCR permit template checks passed.');
