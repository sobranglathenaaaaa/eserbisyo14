'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRightCircle, Bot, CheckCircle2, MessageSquareText, Send, ShieldCheck, UserRound } from 'lucide-react';
import { AssistantThinkingIndicator } from '@/components/chat/assistant-thinking-indicator';
import { PageGuide } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/formatters';
import { sendChatMessage } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import type { ChatMessage } from '@/lib/types/models';
import { parseAssistantSections } from '@/lib/chat/assistant-format';
import { IMPORTANT_UI_TERMS } from '@/lib/chat/ui-terms';
import { copyText } from '@/features/resident/model/copy';
import { ResidentEmpty, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { RESIDENT_CHATBOT_FAQS } from '@/lib/content/chatbot-faq';

const IMPORTANT_UI_TERM_SET = new Set(IMPORTANT_UI_TERMS.map((term) => term.toLowerCase()));

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emphasizeUiTerms(text: string): ReactNode {
  if (!text.trim()) return text;

  const termPattern = [...IMPORTANT_UI_TERMS]
    .sort((a, b) => b.length - a.length)
    .map((term) => escapeRegex(term))
    .join('|');
  const matcher = new RegExp(`(${termPattern})`, 'gi');
  const chunks = text.split(matcher);

  return chunks.map((chunk, index) => {
    if (!chunk) return null;
    const isImportantTerm = IMPORTANT_UI_TERM_SET.has(chunk.toLowerCase());
    if (isImportantTerm) {
      return (
        <strong key={`term-${index}`} className="font-semibold text-[color:var(--resident-ink-900)]">
          {chunk}
        </strong>
      );
    }

    return <span key={`text-${index}`}>{chunk}</span>;
  });
}

export default function ResidentChatbotPage() {
  const { state, locale, user } = useAppState();
  const pageCopy = getRolePageCopy('resident/chatbot');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const latestMessageAnchorRef = useRef<HTMLDivElement | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (!currentUserId) return;

    // Keep chat thread ephemeral per resident account, but avoid resets from transient auth-state updates.
    if (lastUserIdRef.current === null) {
      lastUserIdRef.current = currentUserId;
      return;
    }

    if (lastUserIdRef.current !== currentUserId) {
      setConversationMessages([]);
      lastUserIdRef.current = currentUserId;
    }
  }, [user?.id]);

  const chat = useMemo(() => state.chatSessions.find((item) => item.residentId === user?.id), [state.chatSessions, user?.id]);

  const visibleMessages = useMemo(
    () => [...(chat?.messages ?? []), ...conversationMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [chat?.messages, conversationMessages]
  );

  useEffect(() => {
    if (!visibleMessages.length) return;
    latestMessageAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleMessages.length]);

  const sendQuestion = async (value: string) => {
    if (!value || isSending) return;

    // Always jump to the latest response for explicit send actions.
    setIsSending(true);
    const userMessageCreatedAt = new Date().toISOString();
    setConversationMessages((existing) => [
      ...existing,
      {
        id: `resident-${userMessageCreatedAt}-${existing.length}`,
        sender: 'resident',
        text: value,
        createdAt: userMessageCreatedAt,
      },
    ]);

    try {
      const response = await sendChatMessage(value);
      setConversationMessages((existing) => [
        ...existing,
        {
          id: `assistant-${response.assistantMessage.createdAt}-${existing.length}`,
          sender: response.assistantMessage.sender,
          text: response.assistantMessage.text,
          createdAt: response.assistantMessage.createdAt,
        },
      ]);
      setDraft('');
    } catch {
      const fallbackCreatedAt = new Date().toISOString();
      setConversationMessages((existing) => [
        ...existing,
        {
          id: `assistant-fallback-${fallbackCreatedAt}-${existing.length}`,
          sender: 'assistant',
          text: copyText(
            locale,
            'The assistant is temporarily unavailable. Please try again later or open the correct service page.',
            'Pansamantalang hindi available ang assistant. Subukan ulit mamaya o buksan ang tamang service page.'
          ),
          createdAt: fallbackCreatedAt,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendQuestion(draft.trim());
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          tone="resident"
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <ResidentSection
          title={copyText(locale, 'Conversation', 'Usapan')}
          description={copyText(
            locale,
            'This assistant gives guidance only and does not replace official request submission.',
            'Gabay lamang ito at hindi kapalit ng opisyal na pagsumite ng request.'
          )}
          tone="accent"
        >
          <div className="grid gap-4">
            <div className="rounded-[var(--resident-radius-md)] border border-[color:rgba(29,95,71,0.16)] bg-[linear-gradient(135deg,#f9fcfa_0%,#edf6f1_100%)] p-4 text-sm text-[color:var(--resident-ink-800)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="font-semibold text-[color:var(--resident-ink-900)]">
                    {copyText(locale, 'Guided help only', 'Gabay lamang')}
                  </p>
                  <p className="mt-1 leading-6 text-[color:var(--resident-ink-700)]">
                    {copyText(
                      locale,
                      'Use this assistant to understand the next step, then continue to the proper document request or report page.',
                      'Gamitin ito para malaman ang susunod na hakbang, tapos pumunta sa tamang request o report page.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {!visibleMessages.length ? (
                <ResidentEmpty
                  title={copyText(locale, 'No messages yet', 'Wala pang mensahe')}
                  description={copyText(
                    locale,
                    'Start with a quick question below and the assistant will create a guided thread.',
                    'Magsimula sa mabilis na tanong sa ibaba at gagawa ang assistant ng guided thread.'
                  )}
                />
              ) : (
                <div className="grid gap-3">
                  {visibleMessages.map((message) => {
                    const isResident = message.sender === 'resident';
                    return (
                      <Card
                        key={message.id}
                        className={`rounded-[var(--resident-radius-md)] border p-[clamp(1rem,2.4vw,1.5rem)] ${
                          isResident
                            ? 'ml-auto max-w-[90%] border-[color:rgba(29,95,71,0.16)] bg-[linear-gradient(140deg,#f5fbf8_0%,#e7f2ec_100%)]'
                            : 'mr-auto max-w-[92%] border-[color:rgba(18,56,40,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,251,248,0.98)_100%)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[color:var(--resident-ink-500)]">
                          {isResident ? <UserRound size={12} /> : <Bot size={12} />}
                          <span>{isResident ? copyText(locale, 'You', 'Ikaw') : copyText(locale, 'Assistant', 'Assistant')}</span>
                        </div>
                        {isResident ? (
                          <p className="mt-4 max-w-[72ch] whitespace-pre-wrap text-[clamp(0.92rem,1.5vw,1rem)] leading-[1.62] text-[color:var(--resident-ink-900)]">
                            {message.text}
                          </p>
                        ) : (() => {
                            const sections = parseAssistantSections(message.text);
                            if (!sections) {
                              return (
                                <p className="mt-4 max-w-[72ch] whitespace-pre-wrap text-[clamp(0.92rem,1.5vw,1rem)] leading-[1.62] text-[color:var(--resident-ink-900)]">
                                  {message.text}
                                </p>
                              );
                            }

                            return (
                              <div className="mt-4 grid max-w-[72ch] gap-4 text-[clamp(0.9rem,1.4vw,0.98rem)] leading-[1.62] text-[color:var(--resident-ink-900)]">
                                <div className="rounded-[var(--resident-radius-sm)] border border-[color:rgba(18,56,40,0.09)] bg-[color:rgba(252,254,253,0.94)] px-3 py-2.5">
                                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--resident-ink-600)]">
                                    {copyText(locale, 'Summary', 'Buod')}
                                  </p>
                                  <p className="mt-1.5 text-[color:var(--resident-ink-900)]">{emphasizeUiTerms(sections.summary)}</p>
                                </div>

                                <div className="grid gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--resident-ink-600)]">
                                    {copyText(locale, 'Action steps', 'Mga Hakbang')}
                                  </p>
                                  <ol className="grid gap-2.5">
                                    {sections.steps.map((step, index) => (
                                      <li
                                        key={`${message.id}-step-${index}`}
                                        className="flex items-start gap-2.5 rounded-[var(--resident-radius-sm)] border border-[color:rgba(18,56,40,0.08)] bg-white px-3 py-2"
                                      >
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]">
                                          <CheckCircle2 size={12} />
                                        </span>
                                        <span>{emphasizeUiTerms(step)}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>

                                {sections.reminder ? (
                                  <div className="flex items-start gap-2.5 rounded-[var(--resident-radius-sm)] border border-[color:rgba(163,98,20,0.24)] bg-[color:rgba(255,248,231,0.84)] px-3 py-2.5">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[color:#9d6516]" />
                                    <p>
                                      <span className="font-semibold text-[color:#7f4d0f]">{copyText(locale, 'Reminder:', 'Paalala:')}</span>{' '}
                                      {emphasizeUiTerms(sections.reminder)}
                                    </p>
                                  </div>
                                ) : null}

                                <div className="rounded-[var(--resident-radius-sm)] border border-[color:rgba(29,95,71,0.2)] bg-[linear-gradient(125deg,rgba(240,249,244,0.96)_0%,rgba(234,245,239,0.98)_100%)] px-3 py-2.5">
                                  <p className="flex items-start gap-2 break-words text-[color:var(--resident-ink-900)]">
                                    <ArrowRightCircle size={15} className="mt-0.5 shrink-0 text-[color:var(--resident-accent-strong)]" />
                                    <span>
                                      <span className="font-semibold">{copyText(locale, 'Next page:', 'Susunod na page:')}</span>{' '}
                                      {emphasizeUiTerms(sections.continueHere)}
                                    </span>
                                  </p>
                                </div>

                                <p className="pt-1 text-xs text-[color:var(--resident-ink-600)]">
                                  {copyText(locale, 'Need help with anything else?', 'May iba ka pa bang kailangan na tulong?')}
                                </p>
                              </div>
                            );
                          })()}
                        <p className="mt-3 text-xs text-[color:var(--resident-ink-500)]">{formatDateTime(message.createdAt, locale)}</p>
                      </Card>
                    );
                  })}
                  {isSending ? (
                    <AssistantThinkingIndicator
                      label={copyText(locale, 'Assistant is thinking', 'Nag-iisip ang assistant')}
                    />
                  ) : null}
                  <div ref={latestMessageAnchorRef} aria-hidden="true" />
                </div>
              )}
            </div>

            <form className="grid gap-3" onSubmit={onSubmit}>
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[color:var(--resident-ink-900)]">
                  {copyText(locale, 'Ask a question', 'Magtanong')}
                </span>
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-[130px]"
                  placeholder={copyText(
                    locale,
                    'Example: What should I prepare before requesting a barangay certificate?',
                    'Halimbawa: Ano ang dapat kong ihanda bago humiling ng barangay certificate?'
                  )}
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => setDraft('')}>
                  {copyText(locale, 'Clear draft', 'Linisin ang draft')}
                </Button>
                <Button type="submit" variant="resident" disabled={isSending || !draft.trim()}>
                  <Send size={14} />
                  {copyText(locale, 'Send message', 'Ipadala ang mensahe')}
                </Button>
              </div>
            </form>
          </div>
        </ResidentSection>

        <div className="grid gap-5">
          <ResidentSection
            title={copyText(locale, 'Frequently asked questions', 'Mga madalas itanong')}
            description={copyText(locale, 'Tap a question to send it to Ebi.', 'I-tap ang tanong para ipadala kay Ebi.')}
            density="compact"
          >
            <div className="grid gap-2">
              {RESIDENT_CHATBOT_FAQS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => void sendQuestion(locale === 'fil' ? prompt.fil : prompt.en)}
                  disabled={isSending}
                  className="resident-interactive-lift rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-[color:var(--resident-surface-3)] text-[color:var(--resident-ink-600)]">
                      <MessageSquareText size={14} />
                    </div>
                    <p className="text-sm font-medium leading-6 text-[color:var(--resident-ink-900)]">
                      {locale === 'fil' ? prompt.fil : prompt.en}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ResidentSection>

          <ResidentSection
            title={copyText(locale, 'Continue with official flow', 'Ituloy sa opisyal na flow')}
            description={copyText(locale, 'Jump to the proper service page after getting guidance.', 'Pumunta sa tamang page pagkatapos ng gabay.')}
            density="compact"
          >
            <div className="grid gap-2">
              <Button asChild variant="residentOutline" className="h-auto justify-start rounded-[var(--resident-radius-md)] px-4 py-4 text-sm">
                <Link href="/resident/document-requests">
                  {copyText(locale, 'Open document requests', 'Buksan ang document requests')}
                </Link>
              </Button>
              <Button asChild variant="residentOutline" className="h-auto justify-start rounded-[var(--resident-radius-md)] px-4 py-4 text-sm">
                <Link href="/resident/blotter-reporting">
                  {copyText(locale, 'Open incident reporting', 'Buksan ang incident reporting')}
                </Link>
              </Button>
            </div>
          </ResidentSection>
        </div>
      </div>
    </ResidentShell>
  );
}
