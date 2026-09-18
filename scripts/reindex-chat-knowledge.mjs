import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFileContent(raw) {
  const lines = raw.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function loadLocalEnvFiles() {
  const envFiles = ['.env.local', '.env'];

  for (const fileName of envFiles) {
    const fullPath = path.join(projectRoot, fileName);
    try {
      const content = await readFile(fullPath, 'utf8');
      loadEnvFileContent(content);
    } catch {
      // Ignore missing env files. The script validates required keys later.
    }
  }
}

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

const TOKEN_ALIASES = {
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

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(value, limit = 24) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const tokens = new Set();
  for (const part of normalized.split(' ')) {
    if (part.length < 2) continue;
    if (STOPWORDS.has(part)) continue;
    tokens.add(part);

    const aliases = TOKEN_ALIASES[part];
    if (!aliases) continue;
    for (const alias of aliases) {
      tokens.add(alias);
    }

    if (tokens.size >= limit) break;
  }

  return Array.from(tokens).slice(0, limit);
}

function splitLongText(text, chunkSize = 650) {
  if (text.length <= chunkSize) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= chunkSize) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (sentence.length <= chunkSize) {
      current = sentence;
      continue;
    }

    for (let start = 0; start < sentence.length; start += chunkSize) {
      chunks.push(sentence.slice(start, start + chunkSize));
    }
    current = '';
  }

  if (current) chunks.push(current);
  return chunks;
}

function markdownSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];

  let currentHeading = 'Overview';
  let currentParagraphs = [];

  const flush = () => {
    const merged = currentParagraphs.join(' ').replace(/\s+/g, ' ').trim();
    if (merged) {
      sections.push({ heading: currentHeading, text: merged });
    }
    currentParagraphs = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      continue;
    }

    if (!line || line === '---') {
      if (currentParagraphs.length > 0) {
        flush();
      }
      continue;
    }

    currentParagraphs.push(line.replace(/^[-*]\s+/, ''));
  }

  flush();
  return sections;
}

function chunkMarkdown({ sourceKind, sourceKey, title, body, locale, priority }) {
  const sections = markdownSections(body);
  const chunks = [];

  for (const section of sections) {
    const split = splitLongText(section.text);
    split.forEach((part, index) => {
      const sectionLabel = split.length > 1 ? `${section.heading} (${index + 1})` : section.heading;
      const keywords = extractKeywords(`${title} ${sectionLabel} ${part}`);
      chunks.push({
        source_kind: sourceKind,
        source_key: sourceKey,
        title,
        section: sectionLabel,
        body: part,
        locale,
        keywords,
        priority,
      });
    });
  }

  return chunks;
}

function extractObjectBlock(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

function parseDocumentCatalog(tsSource) {
  const entryRegex = /\{\s*id:\s*'([^']+)'\s*,\s*category:\s*'([^']+)'\s*,\s*type:\s*'([^']+)'\s*,\s*price:\s*([0-9.]+)(?:\s*,\s*pricingNote:\s*'([^']+)')?\s*\}/g;
  const chunks = [];

  for (const match of tsSource.matchAll(entryRegex)) {
    const id = match[1];
    const category = match[2];
    const type = match[3];
    const price = Number(match[4]);
    const pricingNote = match[5];

    const summary = pricingNote
      ? `${type} under ${category}. Fee: PHP ${price.toFixed(2)}. Pricing note: ${pricingNote}.`
      : `${type} under ${category}. Fee: PHP ${price.toFixed(2)}.`;

    chunks.push({
      source_kind: 'document_catalog',
      source_key: id,
      title: 'Document Catalog',
      section: `${category} - ${type}`,
      body: summary,
      locale: 'both',
      keywords: extractKeywords(`${category} ${type} ${summary}`),
      priority: 95,
    });
  }

  return chunks;
}

function parseRolePages(tsSource) {
  const keyRegex = /'([^']+)'\s*:\s*\{/g;
  const chunks = [];

  for (const match of tsSource.matchAll(keyRegex)) {
    const key = match[1];
    if (!key.includes('/')) continue;

    const blockStart = match.index + match[0].lastIndexOf('{');
    const block = extractObjectBlock(tsSource, blockStart);
    if (!block) continue;

    const titleMatch = block.match(/title:\s*\{\s*en:\s*'([^']+)'\s*,\s*fil:\s*'([^']+)'\s*\}/);
    const descMatch = block.match(/description:\s*\{\s*en:\s*'([^']+)'\s*,\s*fil:\s*'([^']+)'\s*\}/);
    const summaryMatch = block.match(/summary:\s*\{\s*en:\s*'([^']+)'\s*,\s*fil:\s*'([^']+)'\s*\}/);

    const stepRegex = /\{\s*en:\s*'([^']+)'\s*,\s*fil:\s*'([^']+)'\s*\}/g;
    const enSteps = [];
    const filSteps = [];

    for (const stepMatch of block.matchAll(stepRegex)) {
      enSteps.push(stepMatch[1]);
      filSteps.push(stepMatch[2]);
    }

    const enTitle = titleMatch ? titleMatch[1] : key;
    const filTitle = titleMatch ? titleMatch[2] : key;
    const enDescription = descMatch ? descMatch[1] : '';
    const filDescription = descMatch ? descMatch[2] : '';
    const enSummary = summaryMatch ? summaryMatch[1] : '';
    const filSummary = summaryMatch ? summaryMatch[2] : '';

    const enBody = [enDescription, enSummary, ...enSteps].filter(Boolean).join(' ');
    const filBody = [filDescription, filSummary, ...filSteps].filter(Boolean).join(' ');

    if (enBody) {
      chunks.push({
        source_kind: 'role_pages',
        source_key: key,
        title: 'Role Page Guidance',
        section: `${key} - ${enTitle}`,
        body: enBody,
        locale: 'en',
        keywords: extractKeywords(`${key} ${enTitle} ${enBody}`),
        priority: 70,
      });
    }

    if (filBody) {
      chunks.push({
        source_kind: 'role_pages',
        source_key: key,
        title: 'Role Page Guidance',
        section: `${key} - ${filTitle}`,
        body: filBody,
        locale: 'fil',
        keywords: extractKeywords(`${key} ${filTitle} ${filBody}`),
        priority: 72,
      });
    }
  }

  return chunks;
}

function parseResidentChatbotContext(tsSource) {
  const entryRegex = /\{\s*id:\s*'([^']+)'\s*,\s*title:\s*'([^']+)'\s*,\s*section:\s*'([^']+)'\s*,\s*body:\s*'([^']+)'\s*,\s*locale:\s*'(en|fil|both)'\s*,\s*priority:\s*([0-9]+)\s*,\s*keywords:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  const chunks = [];

  for (const match of tsSource.matchAll(entryRegex)) {
    const id = match[1];
    const title = match[2];
    const section = match[3];
    const body = match[4];
    const locale = match[5];
    const priority = Number(match[6]);
    const keywordsRaw = match[7];

    const explicitKeywords = Array.from(keywordsRaw.matchAll(/'([^']+)'/g)).map((keywordMatch) => keywordMatch[1]);
    const keywordSeed = `${title} ${section} ${body} ${explicitKeywords.join(' ')}`;

    chunks.push({
      source_kind: 'chatbot_context',
      source_key: id,
      title,
      section,
      body,
      locale,
      keywords: extractKeywords(keywordSeed),
      priority,
    });
  }

  return chunks;
}

async function collectCorpus() {
  const chunks = [];

  const howToUse = await readFile(path.join(projectRoot, 'how-to-use.md'), 'utf8');
  chunks.push(
    ...chunkMarkdown({
      sourceKind: 'how_to_use',
      sourceKey: 'how-to-use.md',
      title: 'How to Use eSerbisyo',
      body: howToUse,
      locale: 'both',
      priority: 100,
    })
  );

  const documentCatalogTs = await readFile(path.join(projectRoot, 'lib/content/document-catalog.ts'), 'utf8');
  chunks.push(...parseDocumentCatalog(documentCatalogTs));

  const rolePagesTs = await readFile(path.join(projectRoot, 'lib/content/role-pages.ts'), 'utf8');
  chunks.push(...parseRolePages(rolePagesTs));

  const residentChatbotContextTs = await readFile(
    path.join(projectRoot, 'lib/content/chatbot-context/resident-context.ts'),
    'utf8'
  );
  chunks.push(...parseResidentChatbotContext(residentChatbotContextTs));

  const requirementDir = path.join(projectRoot, 'requirement');
  const requirementFiles = (await readdir(requirementDir)).filter((name) => name.endsWith('.md')).sort();

  for (const fileName of requirementFiles) {
    const content = await readFile(path.join(requirementDir, fileName), 'utf8');
    chunks.push(
      ...chunkMarkdown({
        sourceKind: 'requirements',
        sourceKey: fileName,
        title: `Requirements - ${fileName}`,
        body: content,
        locale: 'both',
        priority: 10,
      })
    );
  }

  return chunks;
}

async function resolveTenantId(client) {
  if (process.env.TENANT_ID?.trim()) {
    return process.env.TENANT_ID.trim();
  }

  const { data, error } = await client
    .from('tenants')
    .select('id')
    .eq('slug', 'default')
    .limit(1)
    .single();

  if (error || !data?.id) {
    throw new Error(`Unable to resolve tenant id: ${error?.message ?? 'missing default tenant'}`);
  }

  return data.id;
}

function deduplicateChunks(chunks) {
  const uniqueByCompositeKey = new Map();

  for (const chunk of chunks) {
    const compositeKey = [chunk.source_kind, chunk.source_key, chunk.section, chunk.locale].join('||');
    if (!uniqueByCompositeKey.has(compositeKey)) {
      uniqueByCompositeKey.set(compositeKey, chunk);
    }
  }

  return Array.from(uniqueByCompositeKey.values());
}

function requireEnv(name, aliases = []) {
  const keys = [name, ...aliases];
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

async function main() {
  await loadLocalEnvFiles();

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL', ['SUPABASE_URL']);
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const tenantId = await resolveTenantId(client);
  const allChunks = deduplicateChunks(await collectCorpus());

  if (!allChunks.length) {
    console.log('No knowledge chunks generated. Aborting.');
    return;
  }

  const payload = allChunks.map((chunk) => ({
    tenant_id: tenantId,
    ...chunk,
    updated_at: new Date().toISOString(),
  }));

  const { error: deleteError } = await client
    .from('knowledge_chunks')
    .delete()
    .eq('tenant_id', tenantId)
    .in('source_kind', ['how_to_use', 'document_catalog', 'role_pages', 'requirements', 'chatbot_context']);

  if (deleteError) {
    if (deleteError.message?.includes("Could not find the table 'public.knowledge_chunks'")) {
      throw new Error('knowledge_chunks table is missing. Apply supabase/schema.sql first, then run this script again.');
    }
    throw new Error(`Failed to clear old knowledge chunks: ${deleteError.message}`);
  }

  const batchSize = 250;
  for (let start = 0; start < payload.length; start += batchSize) {
    const batch = payload.slice(start, start + batchSize);
    const { error } = await client.from('knowledge_chunks').upsert(batch, {
      onConflict: 'tenant_id,source_kind,source_key,section,locale',
    });

    if (error) {
      if (error.message?.includes("Could not find the table 'public.knowledge_chunks'")) {
        throw new Error('knowledge_chunks table is missing. Apply supabase/schema.sql first, then run this script again.');
      }
      throw new Error(`Failed to upsert knowledge chunks: ${error.message}`);
    }
  }

  console.log(`Indexed ${payload.length} knowledge chunks for tenant ${tenantId}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
