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
  const sandbox = {
    exports: module.exports,
    module,
    require,
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
assert.equal(
  filResult.errorMessage,
  'Mali ang napiling template. Ang na-upload na form ay Lupon Summons, ngunit Barangay Certificate ang napiling template. Mangyaring piliin ang tamang template (Lupon Summons) sa dropdown o i-upload ang tamang form.'
);

// English mismatch message test
const enResult = templates.validateOcrTemplateMatch('barangay_certificate', luponText, 'en');
assert.equal(enResult.isMatch, false);
assert.equal(
  enResult.errorMessage,
  'Selected template is incorrect. The uploaded form is Lupon Summons, but Barangay Certificate was selected. Please select the correct template (Lupon Summons) in the dropdown or upload the matching form.'
);

console.log('Locale English & Filipino mismatch validation tests passed successfully!');
