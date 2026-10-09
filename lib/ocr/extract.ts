import 'server-only';

import { GoogleGenAI } from '@google/genai';

const OCR_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_OCR_MODEL,
      process.env.GEMINI_MODEL,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-3.8-flash',
    ].filter(Boolean) as string[]
  )
);
const OCR_RETRY_DELAYS_MS = [750, 1500];

export class OcrModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrModelUnavailableError';
  }
}

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY is not configured.');
  }
  return new GoogleGenAI({ apiKey });
}

function normalizeExtractedText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseJsonObject(input: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const fenced = input.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
    if (fenced) {
      try {
        const parsed = JSON.parse(fenced);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
      } catch {
        // Try the broad object fallback below.
      }
    }
  }

  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');
  if (firstBrace > -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(input.slice(firstBrace, lastBrace + 1));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeLookupKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanExtractedValue(input: string): string {
  return input
    .replace(/^[\s:;,\-.()_[\]{}]+/, '')
    .replace(/^\s*(?:x|check|checked)\s*[:\-]?\s*/i, '')
    .trim();
}
function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
}

function isTransientOcrModelError(error: unknown): boolean {
  const message = normalizeErrorMessage(error).toLowerCase();
  if (!message) return false;

  return (
    message.includes('high demand') ||
    message.includes('service unavailable') ||
    message.includes('temporarily unavailable') ||
    message.includes('unavailable') ||
    message.includes('503')
  );
}

function getOcrModelUnavailableMessage() {
  return 'The OCR model is temporarily unavailable because demand is high. Please try again in a few moments.';
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  payload: Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= OCR_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await ai.models.generateContent(payload);
    } catch (error) {
      lastError = error;
      if (!isTransientOcrModelError(error) || attempt === OCR_RETRY_DELAYS_MS.length) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, OCR_RETRY_DELAYS_MS[attempt]));
    }
  }

  if (isTransientOcrModelError(lastError)) {
    throw new OcrModelUnavailableError(getOcrModelUnavailableMessage());
  }

  throw lastError instanceof Error ? lastError : new Error('OCR extraction failed.');
}
function hasCheckboxMark(input: string): boolean {
  return /(?:^|[\s[(])(?:x|checked|check|yes|true|✓|✔|☑|☒)(?:$|[\s)\]])/i.test(input);
}

function isSelectionField(field: string): boolean {
  return field.startsWith('reason') || field.startsWith('permit');
}

function pickSourceValue(source: Record<string, unknown>, field: string, templateLabels: Record<string, string>) {
  if (source[field] !== undefined) return source[field];

  const label = templateLabels[field];
  if (label && source[label] !== undefined) return source[label];

  const normalizedField = normalizeLookupKey(field);
  const normalizedLabel = label ? normalizeLookupKey(label) : '';
  const matchingKey = Object.keys(source).find((key) => {
    const normalizedKey = normalizeLookupKey(key);
    return normalizedKey === normalizedField || Boolean(normalizedLabel && normalizedKey === normalizedLabel);
  });

  return matchingKey ? source[matchingKey] : undefined;
}

function parseFieldsFromExtractedText(
  extractedText: string,
  templateFields: string[],
  templateLabels: Record<string, string>,
): Record<string, string> {
  const lines = extractedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const normalizedLabelByField = templateFields.reduce<Record<string, string>>((acc, field) => {
    acc[field] = normalizeLookupKey(templateLabels[field] ?? field);
    return acc;
  }, {});

  const parsed: Record<string, string> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = normalizeLookupKey(line);

    for (const field of templateFields) {
      if (parsed[field]) continue;

      const normalizedLabel = normalizedLabelByField[field];
      const labelIndex = normalizedLine.indexOf(normalizedLabel);
      if (labelIndex === -1) continue;

      if (isSelectionField(field)) {
        if (hasCheckboxMark(line)) {
          parsed[field] = 'true';
        }
        continue;
      }

      const originalLabel = templateLabels[field] ?? field;
      const directMatch = line.match(new RegExp(`${escapeRegExp(originalLabel)}\\s*[:\\-]?\\s*(.*)$`, 'i'));
      const directValue = cleanExtractedValue(directMatch?.[1] ?? '');
      if (directValue) {
        parsed[field] = directValue;
        continue;
      }

      const nextLine = lines[index + 1];
      const nextLineHasLabel = nextLine
        ? Object.values(normalizedLabelByField).some((label) => normalizeLookupKey(nextLine).includes(label))
        : false;
      if (!nextLine || nextLineHasLabel) {
        parsed[field] = '';
        continue;
      }

      parsed[field] = cleanExtractedValue(nextLine);
    }
  }

  return parsed;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeParsedFields(
  parsedFields: unknown,
  templateFields: string[],
  templateLabels: Record<string, string>,
): Record<string, string> {
  const source =
    parsedFields && typeof parsedFields === 'object' && !Array.isArray(parsedFields)
      ? (parsedFields as Record<string, unknown>)
      : {};

  const normalized: Record<string, string> = {};
  for (const field of templateFields) {
    const value = pickSourceValue(source, field, templateLabels);
    normalized[field] = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  }
  return normalized;
}

function normalizeComparableValue(input: string | undefined): string {
  return normalizeLookupKey(input ?? '');
}

function sanitizeParsedFields(parsedFields: Record<string, string>): Record<string, string> {
  if (!('otherPermitText' in parsedFields)) return parsedFields;
  if (hasCheckboxMark(parsedFields.permitOther ?? '')) return parsedFields;

  const otherPermitText = normalizeComparableValue(parsedFields.otherPermitText);
  if (
    otherPermitText &&
    [parsedFields.ownerName, parsedFields.ownerAddress].some(
      (value) => normalizeComparableValue(value) === otherPermitText,
    )
  ) {
    return { ...parsedFields, otherPermitText: '' };
  }

  return parsedFields;
}

export async function extractTextWithTesseract(
  file: File,
  options?: { templateFields?: string[]; templateLabels?: Record<string, string> },
): Promise<{ extractedText: string; parsedFields: Record<string, string>; model: string }> {
  try {
    const { createWorker } = await import('tesseract.js');
    const buffer = Buffer.from(await file.arrayBuffer());
    const worker = await createWorker('eng');
    const ret = await worker.recognize(buffer);
    await worker.terminate();

    const extractedText = normalizeExtractedText(ret.data.text || '');
    const templateFields = options?.templateFields ?? [];
    const templateLabels = options?.templateLabels ?? {};

    const parsedFromText = parseFieldsFromExtractedText(extractedText, templateFields, templateLabels);
    const parsedFields = sanitizeParsedFields(
      templateFields.reduce<Record<string, string>>((acc, field) => {
        acc[field] = parsedFromText[field] || '';
        return acc;
      }, {}),
    );

    return {
      extractedText: extractedText || 'Tesseract OCR processed image.',
      parsedFields,
      model: 'tesseract.js (offline fallback)',
    };
  } catch (err) {
    console.error('Tesseract fallback error:', err);
    throw new Error('OCR extraction failed with Gemini and Tesseract fallback.');
  }
}

export async function extractTextWithGemini(
  file: File,
  options?: { templateFields?: string[]; templateLabels?: Record<string, string> },
): Promise<{ extractedText: string; parsedFields: Record<string, string>; model: string }> {
  const templateFields = options?.templateFields ?? [];
  const templateLabels = options?.templateLabels ?? {};

  try {
    const ai = getGeminiClient();
    const data = Buffer.from(await file.arrayBuffer()).toString('base64');

    const fieldDescriptor = templateFields.map((field) => {
      const label = templateLabels[field]?.trim();
      return label ? `"${field}" (label: "${label}")` : `"${field}"`;
    });

    const extractionPrompt = templateFields.length
      ? `Extract all readable text from this document image and map values for the required template fields.
Return ONLY valid JSON with this shape:
{
  "extractedText": "string",
  "parsedFields": {
    ${templateFields.map((field) => `"${field}": "string"`).join(',\n    ')}
  }
}
Rules:
- Keep line breaks in extractedText.
- Match values using the exact field labels/anchors whenever they are visible in the scanned form.
- Template field map:
  ${fieldDescriptor.join('\n  ')}
- If a required field is missing, set it to an empty string.
- Do not include markdown or explanation.`
      : 'Extract all readable text from this document image. Return only the extracted text with line breaks preserved.';

    let rawOutput = '';
    let selectedModel = OCR_MODELS[0] || 'gemini-2.0-flash';
    let lastGenError: unknown = null;

    for (const candidateModel of OCR_MODELS) {
      try {
        const response = await generateContentWithRetry(ai, {
          model: candidateModel,
          contents: [
            {
              role: 'user',
              parts: [
                { text: extractionPrompt },
                { inlineData: { mimeType: file.type, data } },
              ],
            },
          ],
        });
        rawOutput = response.text ?? '';
        if (rawOutput.trim()) {
          selectedModel = candidateModel;
          lastGenError = null;
          break;
        }
      } catch (err) {
        lastGenError = err;
        const msg = normalizeErrorMessage(err).toLowerCase();
        if (msg.includes('404') || msg.includes('not_found') || msg.includes('not found') || msg.includes('no longer available')) {
          console.warn(`[Gemini OCR] Model "${candidateModel}" unavailable or not found. Trying next candidate model...`);
          continue;
        }
        break;
      }
    }

    if (!rawOutput.trim()) {
      if (lastGenError) throw lastGenError;
      throw new Error('No OCR text was returned from the model.');
    }

    if (!templateFields.length) {
      const extractedText = normalizeExtractedText(rawOutput);
      if (!extractedText) {
        throw new Error('No OCR text was returned from the model.');
      }
      return { extractedText, parsedFields: {}, model: selectedModel };
    }

    const json = parseJsonObject(rawOutput);
    const extractedText = normalizeExtractedText(
      typeof json?.extractedText === 'string' ? json.extractedText : rawOutput,
    );
    if (!extractedText) {
      throw new Error('No OCR text was returned from the model.');
    }
    const parsedFromJson = normalizeParsedFields(json?.parsedFields, templateFields, templateLabels);
    const parsedFromText = parseFieldsFromExtractedText(extractedText, templateFields, templateLabels);
    const parsedFields = sanitizeParsedFields(
      templateFields.reduce<Record<string, string>>((acc, field) => {
        acc[field] = parsedFromJson[field] || parsedFromText[field] || '';
        return acc;
      }, {}),
    );

    return {
      extractedText,
      parsedFields,
      model: selectedModel,
    };
  } catch (error) {
    console.warn('[Gemini OCR unavailable/failed. Falling back to Tesseract.js]:', error);
    return await extractTextWithTesseract(file, options);
  }
}
