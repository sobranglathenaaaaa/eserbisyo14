import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  const customRequire = (id) => {
    if (id.startsWith('@/')) {
      const resolved = id.replace('@/', '') + '.ts';
      return loadTypeScriptModule(resolved);
    }
    return require(id);
  };
  const sandbox = {
    exports: module.exports,
    module,
    require: customRequire,
  };
  vm.runInNewContext(transpiled.outputText, sandbox, { filename: filePath });
  return module.exports;
}

const templates = loadTypeScriptModule('lib/ocr/templates.ts');

const luponText = `REPUBLIC OF THE PHILIPPINES
OFFICE OF THE PUNONG BARANGAY
LUPON SUMMONS INTAKE FORM
FOR OCR ISSUANCE
Barangay Case Number: 2026-009
Date Filed: 2026-09-12
Complainant/s: Juan Dela Cruz
Complaint For: Breach of Peace
Respondent/s: Pedro Santos
Summons To: Pedro Santos
Hearing Day: 15 Hearing Month: September Hearing Year: 2026
Hearing Time: 10:00 AM`;

// Filipino mismatch message test
const filResult = templates.validateOcrTemplateMatch('barangay_certificate', luponText, 'fil');
assert.equal(filResult.isMatch, false);

// English mismatch message test
const enResult = templates.validateOcrTemplateMatch('barangay_certificate', luponText, 'en');
assert.equal(enResult.isMatch, false);

const indigencyText = `REPUBLIC OF THE PHILIPPINES
OFFICE OF THE PUNONG BARANGAY
CERTIFICATE OF INDIGENCY
This is to certify that Juan Dela Cruz whose residence at Barangay Hall, is an indigent resident.
Issued upon the request of Juan Dela Cruz.`;

// Test Indigency uploaded when Barangay Certification category is selected
const indigencyUnderCategoryResult = templates.validateOcrTemplateMatch('barangay_certification', indigencyText, 'en');
assert.equal(indigencyUnderCategoryResult.isMatch, true);

// Test Indigency uploaded when Barangay Certificate template is selected
const indigencyUnderCertResult = templates.validateOcrTemplateMatch('barangay_certificate', indigencyText, 'en');
assert.equal(indigencyUnderCertResult.isMatch, true);

// Test Lupon uploaded when Barangay Certification category is selected -> should mismatch
const luponMismatchResult = templates.validateOcrTemplateMatch('barangay_certification', luponText, 'en');
assert.equal(luponMismatchResult.isMatch, false);
assert.equal(
  luponMismatchResult.errorMessage,
  'Selected template is incorrect. The uploaded form is Lupon Summons, but Barangay Certification was selected. Please select the correct template (Lupon Summons) in the dropdown or upload the matching form.'
);

console.log('All OCR template validation tests (including Indigency & category matching) passed successfully!');

