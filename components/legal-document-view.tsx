import type { LegalDocument } from '@/lib/content/legal-documents';
import { cn } from '@/lib/utils';

type Block =
  | { type: 'heading'; level: 1 | 2; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  const paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph.length = 0;
  }

  function flushList() {
    if (!list.length) return;
    blocks.push({ type: 'list', items: list });
    list = [];
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: 1, text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function formatLegalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function LegalDocumentView({ document, framed = true }: { document: LegalDocument; framed?: boolean }) {
  const blocks = parseBody(document.body);

  return (
    <article
      className={cn(
        'bg-white/90 p-5 md:p-8',
        framed ? 'rounded-2xl border border-[color:rgba(25,76,57,0.14)] shadow-[0_20px_40px_rgba(14,56,37,0.08)]' : 'rounded-none border-0 shadow-none'
      )}
    >
      <header className="border-b border-[color:rgba(25,76,57,0.12)] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:#2f6b53]">eSerbisyo Legal</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-[color:#0f3825] md:text-4xl">{document.title}</h1>
        <p className="mt-2 text-sm text-[color:#305544]">eSerbisyo: Barangay Service and Records Management System</p>
      </header>

      <section className="mt-7 space-y-4 text-[15px] leading-7 text-[color:#173629]">
        {blocks.map((block, index) => {
          if (block.type === 'heading') {
            const Heading = block.level === 1 ? 'h2' : 'h3';
            return (
              <Heading
                key={`${block.type}-${index}`}
                className={
                  block.level === 1
                    ? 'pt-2 font-heading text-2xl font-semibold text-[color:#0f3825]'
                    : 'font-semibold text-[color:#123225]'
                }
              >
                {block.text}
              </Heading>
            );
          }

          if (block.type === 'list') {
            return (
              <ul key={`${block.type}-${index}`} className="list-disc space-y-1 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={`${index}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          }

          return <p key={`${block.type}-${index}`}>{block.text}</p>;
        })}
      </section>
    </article>
  );
}
