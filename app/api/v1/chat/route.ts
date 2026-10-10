import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { assertCan } from '@/lib/auth/permissions';
import {
  buildRetrievedContext,
  detectChatLocale,
  retrieveKnowledgeChunks,
  summarizeRetrievedChunks,
} from '@/lib/chat/rag';
import { normalizeNextPageForChat } from '@/lib/chat/next-page';
import { normalizeAssistantText, parseAssistantSections } from '@/lib/chat/assistant-format';
import { requireAuth } from '@/lib/auth/request-auth';

type ChatRequestBody = {
  text?: unknown;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const MAX_INPUT_LENGTH = 1200;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 12;
const SUMMARY_MAX_WORDS = 20;
const STEP_MAX_WORDS = 16;
const STEP_MIN_COUNT = 2;
const STEP_MAX_COUNT = 3;
const FALLBACK_ASSISTANT_TEXT_FIL =
  'Salamat sa mensahe mo. May pansamantalang aberya sa assistant. Pakisubukang muli mamaya o magpatuloy sa tamang request page para sa opisyal na proseso.';
const FALLBACK_ASSISTANT_TEXT_EN =
  'Thanks for your message. The assistant is temporarily unavailable. Please try again later or continue using the correct request page for the official process.';

const SYSTEM_INSTRUCTION =
  'You are the eSerbisyo barangay assistant. Give direct, practical guidance that residents can act on immediately. Use exact resident navigation labels and not internal page names (for example: Get Documents, Updates, Book an Appointment, Past Requests, Report an Incident). Keep wording plain, short, and factual. Use only provided context and known app flows. Never invent requirements, fees, status rules, or policy details. If unsure, clearly state what to verify at the barangay office.';
const RESPONSE_TEMPLATE_RULES =
  'Output must follow this plain-text structure and order exactly:\nSummary: one short sentence (max 20 words)\nAction Steps:\n1. <imperative step, max 16 words>\n2. <imperative step, max 16 words>\n3. <optional imperative step, max 16 words>\nReminder (optional): one short caution line only when needed\nNext Page: <resident navigation label> (<route>)\nRules: use only numbered steps, keep 2 to 3 steps, avoid filler text, and do not use markdown formatting (no headings, no bold/italic markers, no bullets using *, -, _). Always use actual resident navigation labels.';

type LocaleHint = 'en' | 'fil';

const userRateLimit = new Map<string, { windowStart: number; count: number }>();
let geminiClient: GoogleGenAI | null = null;

function enforceRateLimit(userId: string): boolean {
  const now = Date.now();
  const existing = userRateLimit.get(userId);
  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    userRateLimit.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }

  existing.count += 1;
  userRateLimit.set(userId, existing);
  return true;
}

function getGeminiClient() {
  if (geminiClient) return geminiClient;

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY is not configured.');
  }

  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

function firstSentence(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  const sentenceMatch = normalized.match(/^.+?[.!?](?=\s|$)/);
  return sentenceMatch ? sentenceMatch[0].trim() : normalized;
}

function toWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function limitWords(text: string, maxWords: number): string {
  const words = toWords(text);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(' ').trim();
}

function cleanLine(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function stripSectionLabel(line: string): string {
  return line
    .replace(/^(summary|short answer)\s*:\s*/i, '')
    .replace(/^(steps|action steps)\s*:\s*/i, '')
    .replace(/^(reminder|important notes?)\s*:\s*/i, '')
    .replace(/^(continue here|next page to open|next page)\s*:\s*/i, '')
    .trim();
}

function extractSectionLine(text: string, labels: string[]): string {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    for (const label of labels) {
      const sectionRegex = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'i');
      const match = trimmedLine.match(sectionRegex);
      if (match?.[1]) {
        return stripSectionLabel(match[0]);
      }
    }
  }

  const stopPattern =
    'summary|short answer|steps|action steps|reminder|important notes?|continue here|next page to open|next page';
  for (const label of labels) {
    const inlineRegex = new RegExp(
      `${label}\\s*:\\s*([\\s\\S]*?)(?=(?:\\n|\\s+)(?:${stopPattern})\\s*:|$)`,
      'i'
    );
    const inlineMatch = text.match(inlineRegex);
    if (inlineMatch?.[1]) {
      return inlineMatch[1].trim();
    }
  }

  return '';
}

function extractSteps(text: string): string[] {
  const stepsBlockMatch = text.match(
    /(?:^|\n)(?:steps|action steps)\s*:\s*([\s\S]*?)(?=\n(?:summary|short answer|reminder|important notes?|continue here|next page to open|next page)\s*:|$)/i
  );

  if (stepsBlockMatch?.[1]) {
    const stepLines = stepsBlockMatch[1]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);

    if (stepLines.length > 0) {
      return stepLines;
    }
  }

  const numberedStepMatches = text.match(/\b\d+\.\s+[^\n]+/g) ?? [];
  const numberedSteps = numberedStepMatches
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  if (numberedSteps.length > 0) {
    return numberedSteps;
  }

  return [];
}

function createFallbackSteps(localeHint: LocaleHint): string[] {
  if (localeHint === 'fil') {
    return [
      'Buksan ang tamang service page sa resident menu.',
      'Ihanda ang kailangan na detalye at isumite sa opisyal na form.',
      'Suriin ang status sa Notifications o Request History.',
    ];
  }

  return [
    'Open the correct service page from the resident menu.',
    'Prepare the needed details and submit through the official form.',
    'Track status updates in Notifications or Request History.',
  ];
}

function fallbackAssistantText(localeHint: LocaleHint): string {
  return localeHint === 'fil' ? FALLBACK_ASSISTANT_TEXT_FIL : FALLBACK_ASSISTANT_TEXT_EN;
}

function isDocumentPreparationQuestion(inputText: string): boolean {
  const normalized = inputText.toLowerCase().replace(/[?!.]/g, ' ').replace(/\s+/g, ' ').trim();
  return (
    normalized === 'what do i need to prepare for a document request' ||
    normalized === 'ano ang kailangan kong ihanda para sa document request'
  );
}

function documentPreparationGuidance(localeHint: LocaleHint): string {
  if (localeHint === 'fil') {
    return [
      'Summary: Ihanda ang personal details, valid ID, malinaw na purpose, at supporting file kung kailangan.',
      'Action Steps:',
      '1. Ihanda ang buong pangalan, birthdate, address, email, at phone number.',
      '2. Ihanda ang detalye ng valid ID at malinaw na purpose ng request.',
      '3. Tingnan ang form kung may kailangang supporting file bago magsumite.',
      'Reminder: Suriin ang categories at fees sa Document Requests bago isumite.',
      'Next Page: Document Requests (/resident/document-requests)',
    ].join('\n');
  }

  return [
    'Summary: Prepare your personal details, valid ID, clear purpose, and supporting file if required.',
    'Action Steps:',
    '1. Prepare your full name, birthdate, address, email, and phone number.',
    '2. Prepare your valid ID details and clear purpose for the request.',
    '3. Check the form for any required supporting file before submitting.',
    'Reminder: Review categories and fees in Document Requests before submitting.',
    'Next Page: Document Requests (/resident/document-requests)',
  ].join('\n');
}

function normalizeSummary(rawSummary: string, localeHint: LocaleHint): string {
  const fallback =
    localeHint === 'fil'
      ? 'Narito ang pinakamabilis na gabay batay sa tanong mo.'
      : 'Here is the quickest guidance based on your question.';
  const summary = cleanLine(stripSectionLabel(rawSummary || fallback));
  return limitWords(summary, SUMMARY_MAX_WORDS);
}

function normalizeSteps(rawSteps: string[], localeHint: LocaleHint): string[] {
  const fallback = createFallbackSteps(localeHint);
  const candidate = rawSteps.length > 0 ? rawSteps : fallback;
  const unique = new Set<string>();
  const normalized: string[] = [];

  for (const step of candidate) {
    const cleanStep = limitWords(cleanLine(stripSectionLabel(step)), STEP_MAX_WORDS);
    if (!cleanStep) continue;

    const key = cleanStep.toLowerCase();
    if (unique.has(key)) continue;

    unique.add(key);
    normalized.push(cleanStep);

    if (normalized.length >= STEP_MAX_COUNT) {
      break;
    }
  }

  if (normalized.length >= STEP_MIN_COUNT) {
    return normalized;
  }

  return fallback.map((step) => limitWords(cleanLine(step), STEP_MAX_WORDS)).slice(0, STEP_MAX_COUNT);
}

function normalizeReminder(rawReminder: string): string {
  const reminder = cleanLine(stripSectionLabel(rawReminder));
  if (!reminder) return '';
  return limitWords(reminder, STEP_MAX_WORDS);
}

function enforceAssistantTemplate(rawText: string, localeHint: LocaleHint): string {
  const normalizedText = normalizeAssistantText(rawText);
  const parsed = parseAssistantSections(normalizedText);

  const extractedSummary =
    parsed?.summary || extractSectionLine(normalizedText, ['summary', 'short answer']) || firstSentence(normalizedText);
  const summary = normalizeSummary(extractedSummary, localeHint);

  const steps = parsed?.steps ?? extractSteps(normalizedText);
  const resolvedSteps = normalizeSteps(steps, localeHint);

  const reminder = normalizeReminder(
    parsed?.reminder ?? extractSectionLine(normalizedText, ['reminder', 'important notes'])
  );

  const nextPage =
    parsed?.continueHere ??
    extractSectionLine(normalizedText, ['continue here', 'next page to open', 'next page']);

  const resolvedNextPage = normalizeNextPageForChat(cleanLine(stripSectionLabel(nextPage)), localeHint);

  const lines = [
    `Summary: ${summary}`,
    'Action Steps:',
    ...resolvedSteps.map((step, index) => `${index + 1}. ${stripSectionLabel(step)}`),
    `Next Page: ${resolvedNextPage}`,
  ];

  if (reminder) {
    lines.splice(lines.length - 1, 0, `Reminder: ${reminder}`);
  }

  return normalizeAssistantText(lines.join('\n'));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'submit_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Resident access required', 403);
  }

  const body = (await request.json().catch(() => null)) as ChatRequestBody | null;
  const inputText = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!inputText) {
    return fail('VALIDATION_ERROR', 'text is required', 400);
  }

  if (inputText.length > MAX_INPUT_LENGTH) {
    return fail('VALIDATION_ERROR', `text must be ${MAX_INPUT_LENGTH} characters or less`, 400);
  }

  if (!enforceRateLimit(auth.userId)) {
    return fail('RATE_LIMITED', 'Too many chat messages. Please wait before sending again.', 429);
  }

  const localeHint = detectChatLocale(inputText);
  let retrievedContext = '';
  let retrievedCount = 0;
  let retrievedTopSourceLabels: string[] = [];
  let retrievedScoreSnapshot: number[] = [];

  try {
    const retrievedChunks = await retrieveKnowledgeChunks({
      tenantId: auth.tenantId,
      inputText,
      localeHint,
    });
    retrievedCount = retrievedChunks.length;
    retrievedContext = buildRetrievedContext(retrievedChunks);
    const telemetrySummary = summarizeRetrievedChunks(retrievedChunks);
    retrievedTopSourceLabels = telemetrySummary.topSourceLabels;
    retrievedScoreSnapshot = telemetrySummary.scoreSnapshot;
  } catch (error) {
    await writeAuditLog({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      action: 'chat.rag_retrieval_failed',
      context: {
        reason: error instanceof Error ? error.message : 'Unknown retrieval error',
        localeHint,
        queryLength: inputText.length,
      },
    });
  }

  const sessionId = globalThis.crypto?.randomUUID?.() ?? `ephemeral-${auth.userId}-${Date.now()}`;
  const ragAugmentedText = retrievedContext ? `${inputText}\n\nReference context:\n${retrievedContext}` : inputText;
  const contents = [{ role: 'user' as const, parts: [{ text: ragAugmentedText }] }];

  const dynamicSystemInstruction =
    localeHint === 'fil'
      ? `${SYSTEM_INSTRUCTION}\n${RESPONSE_TEMPLATE_RULES}\nMatch the user's language. Write content lines in Filipino unless the user clearly asks for English.`
      : `${SYSTEM_INSTRUCTION}\n${RESPONSE_TEMPLATE_RULES}\nMatch the user's language. Write content lines in English unless the user clearly asks for Filipino.`;

  let assistantText = fallbackAssistantText(localeHint);
  const generatedAt = new Date().toISOString();

  if (isDocumentPreparationQuestion(inputText)) {
    assistantText = documentPreparationGuidance(localeHint);
  } else {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: dynamicSystemInstruction,
        },
      });
      const responseText = typeof response.text === 'string' ? response.text.trim() : '';
      if (responseText) {
        assistantText = enforceAssistantTemplate(responseText, localeHint);
      }
    } catch (error) {
      await writeAuditLog({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        actorRole: auth.role,
        action: 'chat.assistant_fallback',
        targetId: sessionId,
        context: {
          model: GEMINI_MODEL,
          reason: error instanceof Error ? error.message : 'Unknown Gemini error',
        },
      });
    }
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'chat.message_sent',
    targetId: sessionId,
    context: {
      model: GEMINI_MODEL,
      assistantPersisted: false,
      ragContextApplied: retrievedContext.length > 0,
      ragChunksUsed: retrievedCount,
      localeHint,
      ragTopSourceLabels: retrievedTopSourceLabels,
      ragScoreSnapshot: retrievedScoreSnapshot,
    },
  });

  return ok({
    sessionId,
    assistantMessage: {
      sender: 'assistant' as const,
      text: assistantText,
      createdAt: generatedAt,
      temporary: true as const,
    },
  });
}
