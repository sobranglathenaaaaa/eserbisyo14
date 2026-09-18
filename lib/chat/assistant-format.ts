export type AssistantSections = {
  summary: string;
  steps: string[];
  reminder?: string;
  continueHere: string;
};

const SECTION_LABELS = [
  'summary',
  'short answer',
  'steps',
  'action steps',
  'reminder',
  'important notes',
  'continue here',
  'next page to open',
  'next page',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeMarkdownEmphasis(text: string): string {
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2');
}

function splitInlineSectionLabels(text: string): string {
  const labelPattern = SECTION_LABELS.map((label) => escapeRegex(label)).join('|');
  return text.replace(new RegExp(`([^\\n])\\s+(${labelPattern})\\s*:`, 'gi'), '$1\n$2:');
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\t ]{2,}/g, ' ')
    .replace(/\n[\t ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export function normalizeAssistantText(rawText: string): string {
  const withNormalizedNewlines = rawText.replace(/\r\n?/g, '\n');
  const withSplitLabels = splitInlineSectionLabels(withNormalizedNewlines);
  const withSplitSteps = withSplitLabels.replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n$2');
  const withoutMarkdownEmphasis = removeMarkdownEmphasis(withSplitSteps);

  return normalizeWhitespace(withoutMarkdownEmphasis);
}

function normalizeStepLine(line: string): string {
  return line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
}

function extractLineValue(normalizedText: string, labels: string[]): string {
  const lines = normalizedText.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    for (const label of labels) {
      const lineRegex = new RegExp(`^${escapeRegex(label)}\\s*:\\s*(.+)$`, 'i');
      const lineMatch = trimmedLine.match(lineRegex);
      if (lineMatch?.[1]) {
        return lineMatch[1].trim();
      }
    }
  }

  const stopPattern = SECTION_LABELS.map((label) => escapeRegex(label)).join('|');
  for (const label of labels) {
    const inlineRegex = new RegExp(
      `${escapeRegex(label)}\\s*:\\s*([\\s\\S]*?)(?=(?:\\n|\\s+)(?:${stopPattern})\\s*:|$)`,
      'i'
    );
    const inlineMatch = normalizedText.match(inlineRegex);
    if (inlineMatch?.[1]) {
      return inlineMatch[1].trim();
    }
  }

  return '';
}

function extractSteps(normalizedText: string): string[] {
  const stepsBlockMatch = normalizedText.match(
    /(?:^|\n)(?:steps|action steps)\s*:\s*([\s\S]*?)(?=(?:\n|\s+)(?:summary|short answer|reminder|important notes?|continue here|next page to open|next page)\s*:|$)/i
  );

  if (stepsBlockMatch?.[1]) {
    const block = stepsBlockMatch[1].trim();
    const numberedMatches = block.match(/\b\d+\.\s+[^\n]+/g) ?? [];
    if (numberedMatches.length > 0) {
      return numberedMatches.map((line) => normalizeStepLine(line)).filter(Boolean);
    }

    const lines = block
      .split('\n')
      .map((line) => normalizeStepLine(line))
      .filter(Boolean);
    if (lines.length > 0) {
      return lines;
    }
  }

  const numberedStepMatches = normalizedText.match(/\b\d+\.\s+[^\n]+/g) ?? [];
  return numberedStepMatches.map((line) => normalizeStepLine(line)).filter(Boolean);
}

export function parseAssistantSections(text: string): AssistantSections | null {
  const normalizedText = normalizeAssistantText(text);
  if (!normalizedText) {
    return null;
  }

  const summary = extractLineValue(normalizedText, ['summary', 'short answer']);
  const steps = extractSteps(normalizedText);
  const reminder = extractLineValue(normalizedText, ['reminder', 'important notes']);
  const continueHere = extractLineValue(normalizedText, ['continue here', 'next page to open', 'next page']);

  if (!summary || steps.length === 0 || !continueHere) {
    return null;
  }

  return {
    summary,
    steps,
    reminder: reminder || undefined,
    continueHere,
  };
}