import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const QUERY_TOKEN_LIMIT = 18;
const RETRIEVAL_ROW_LIMIT = 40;
const RETRIEVAL_RESULT_LIMIT = 5;
const MAX_CONTEXT_CHARS = 2200;

const LANGUAGE_HINT_FILIPINO = [
  'ano',
  'paano',
  'kailan',
  'saan',
  'pwede',
  'maaari',
  'kailangan',
  'request',
  'barangay',
  'resibo',
  'bayad',
  'salamat',
  'po',
  'naman',
  'mga',
  'para',
  'dokumento',
  'kumuha',
  'mag',
  'wala',
  'hindi',
  'pila',
  'reserbasyon',
  'ulat',
];

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'at',
  'is',
  'are',
  'be',
  'this',
  'that',
  'it',
  'with',
  'from',
  'by',
  'as',
  'you',
  'your',
  'i',
  'we',
  'our',
  'can',
  'need',
  'help',
  'please',
  'ang',
  'ng',
  'sa',
  'na',
  'at',
  'para',
  'mga',
  'po',
  'ba',
  'ako',
  'ko',
  'si',
  'ni',
  'kay',
  'ito',
  'iyan',
  'yun',
  'yung',
  'may',
  'wala',
  'naman',
  'lang',
  'din',
  'rin',
]);

const TOKEN_ALIASES: Record<string, string[]> = {
  certification: ['certificate', 'certification', 'barangay', 'document'],
  certificate: ['certificate', 'certification', 'barangay', 'document'],
  clearance: ['clearance', 'police', 'nbi', 'court'],
  school: ['school', 'student', 'education', 'scholarship'],
  queue: ['queue', 'pila', 'line', 'number'],
  incident: ['incident', 'blotter', 'report', 'complaint'],
  blotter: ['incident', 'blotter', 'report'],
  profile: ['profile', 'census', 'update', 'details'],
  status: ['status', 'pending', 'approved', 'processing', 'completed', 'declined', 'cancelled'],
};

const SOURCE_KIND_BOOST: Record<string, number> = {
  how_to_use: 30,
  chatbot_context: 26,
  role_pages: 22,
  document_catalog: 18,
  requirements: 4,
};

export type ChatLocaleHint = 'en' | 'fil';

export interface RetrievedKnowledgeChunk {
  id: string;
  sourceKind: string;
  sourceKey: string;
  title: string;
  section: string;
  body: string;
  locale: 'en' | 'fil' | 'both';
  priority: number;
  score: number;
}

export interface RetrievalTelemetrySummary {
  topSourceLabels: string[];
  scoreSnapshot: number[];
}

type KnowledgeChunkRow = {
  id: string;
  source_kind: string;
  source_key: string;
  title: string;
  section: string;
  body: string;
  locale: 'en' | 'fil' | 'both';
  priority: number;
  keywords: string[] | null;
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addAliasTokens(token: string, sink: Set<string>) {
  sink.add(token);
  const aliases = TOKEN_ALIASES[token];
  if (!aliases) return;
  for (const alias of aliases) {
    sink.add(alias);
  }
}

export function extractQueryTokens(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const uniqueTokens = new Set<string>();
  for (const part of normalized.split(' ')) {
    if (part.length < 2) continue;
    if (STOPWORDS.has(part)) continue;
    addAliasTokens(part, uniqueTokens);
  }

  return Array.from(uniqueTokens).slice(0, QUERY_TOKEN_LIMIT);
}

export function detectChatLocale(value: string): ChatLocaleHint {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 'en';
  }

  const tokenSet = new Set(normalized.split(' '));
  let filipinoSignal = 0;

  for (const hint of LANGUAGE_HINT_FILIPINO) {
    if (tokenSet.has(hint)) {
      filipinoSignal += 1;
    }
  }

  return filipinoSignal >= 2 ? 'fil' : 'en';
}

function scoreChunk(queryTokens: string[], inputText: string, row: KnowledgeChunkRow): number {
  const keywordSet = new Set((row.keywords ?? []).map((token) => token.toLowerCase()));
  const bodyLower = row.body.toLowerCase();
  const titleLower = row.title.toLowerCase();
  const inputLower = inputText.toLowerCase();

  let overlap = 0;
  for (const token of queryTokens) {
    if (keywordSet.has(token)) overlap += 1;
  }

  let score = overlap * 6 + row.priority + (SOURCE_KIND_BOOST[row.source_kind] ?? 0);

  if (inputLower.length > 0 && titleLower.includes(inputLower)) {
    score += 10;
  }

  for (const token of queryTokens) {
    if (titleLower.includes(token)) {
      score += 3;
    }
    if (bodyLower.includes(token)) {
      score += 1;
    }
  }

  return score;
}

export async function retrieveKnowledgeChunks(params: {
  tenantId: string;
  inputText: string;
  localeHint: ChatLocaleHint;
}): Promise<RetrievedKnowledgeChunk[]> {
  const queryTokens = extractQueryTokens(params.inputText);
  const admin = getSupabaseAdminClient();

  let query = admin
    .from('knowledge_chunks')
    .select('id,source_kind,source_key,title,section,body,locale,priority,keywords')
    .eq('tenant_id', params.tenantId)
    .or(`locale.eq.${params.localeHint},locale.eq.both`)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(RETRIEVAL_ROW_LIMIT);

  if (queryTokens.length > 0) {
    query = query.overlaps('keywords', queryTokens);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Knowledge retrieval failed: ${error.message}`);
  }

  const rows = (data as KnowledgeChunkRow[] | null) ?? [];
  const ranked = rows
    .map((row) => ({
      id: row.id,
      sourceKind: row.source_kind,
      sourceKey: row.source_key,
      title: row.title,
      section: row.section,
      body: row.body,
      locale: row.locale,
      priority: row.priority,
      score: scoreChunk(queryTokens, params.inputText, row),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked: RetrievedKnowledgeChunk[] = [];
  const seen = new Set<string>();

  for (const row of ranked) {
    const dedupeKey = `${row.sourceKind}:${row.sourceKey}:${row.section}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    picked.push(row);
    if (picked.length >= RETRIEVAL_RESULT_LIMIT) break;
  }

  return picked;
}

export function buildRetrievedContext(chunks: RetrievedKnowledgeChunk[]): string {
  if (!chunks.length) {
    return '';
  }

  let remaining = MAX_CONTEXT_CHARS;
  const lines: string[] = ['Use only the verified guidance below when relevant:'];

  for (const chunk of chunks) {
    if (remaining <= 0) break;

    const prefix = `- [${chunk.title} :: ${chunk.section}]`;
    const availableBodyLength = Math.max(0, remaining - prefix.length - 6);
    if (availableBodyLength <= 0) break;

    const body = chunk.body.length > availableBodyLength ? `${chunk.body.slice(0, availableBodyLength - 3)}...` : chunk.body;
    const line = `${prefix} ${body}`;

    lines.push(line);
    remaining -= line.length;
  }

  return lines.join('\n');
}

export function summarizeRetrievedChunks(chunks: RetrievedKnowledgeChunk[]): RetrievalTelemetrySummary {
  const topSourceLabels = chunks.slice(0, 3).map((chunk) => `${chunk.sourceKind}:${chunk.sourceKey}`);
  const scoreSnapshot = chunks.slice(0, 5).map((chunk) => Math.round(chunk.score));

  return {
    topSourceLabels,
    scoreSnapshot,
  };
}
