'use client';

import Image from 'next/image';
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRightCircle,
  Bell,
  CheckCircle2,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Siren,
  Star,
  Send,
  UserRound,
  Trash2,
  X,
  Menu,
} from 'lucide-react';
import { AssistantThinkingIndicator } from '@/components/chat/assistant-thinking-indicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  acknowledgeDocumentRequestFeedbackPrompt,
  addFeedback,
  markNotificationRead,
  sendChatMessage,
} from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { parseAssistantSections } from '@/lib/chat/assistant-format';
import { IMPORTANT_UI_TERMS } from '@/lib/chat/ui-terms';
import type { ChatMessage } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import { PortalShellBase } from '@/components/portal-shell-base';
import { formatDateTime } from '@/lib/formatters';
import { DocumentRequestSummaryModal } from './document-request-summary-modal';
import { copy, type LocalizedCopy } from '../model/copy';
import { copyText } from '../model/copy';
import {
  getResidentMobileSidebarItems,
  getResidentSidebarItems,
  residentSidebarSections,
} from '../model/navigation';
import { getResidentChatSession, getResidentNotifications } from '../model/selectors';
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

function ResidentFloatingAssistant() {
  const { state, user, locale } = useAppState();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [text, setText] = useState('');
  const [assistantRating, setAssistantRating] = useState(0);
  const [assistantFeedback, setAssistantFeedback] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [temporarySessionMessages, setTemporarySessionMessages] = useState<ChatMessage[]>([]);
  const [assistantSessionStartedAt, setAssistantSessionStartedAt] = useState<string | null>(null);
  const assistantMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const chat = useMemo(() => getResidentChatSession(state, user?.id), [state, user?.id]);
  const visibleMessages = useMemo(() => {
    const persisted = chat?.messages ?? [];
    const merged = [...persisted, ...temporarySessionMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (!assistantSessionStartedAt) return merged;
    return merged.filter((message) => message.createdAt >= assistantSessionStartedAt);
  }, [assistantSessionStartedAt, chat?.messages, temporarySessionMessages]);

  useEffect(() => {
    if (searchParams.get('assistant') !== 'open') return;

    setIsAssistantOpen(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('assistant');
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!isAssistantOpen) return;
    assistantMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

    // If there are no visible messages for the assistant session, add an automatic
    // greeting addressed to the resident (localized). This creates a friendly
    // entry point like: "Hi <FirstName>, I'm Ebi. How may I help you today?"
    try {
      if (visibleMessages.length === 0 && temporarySessionMessages.every((m) => !m.id?.includes('greeting'))) {
        const now = new Date().toISOString();
        const firstName = user?.firstName ?? user?.fullName?.trim().split(/\s+/)[0] ?? '';
        const greetingText =
          locale === 'fil'
            ? `Hi ${firstName}, ako si Ebi. Paano kita matutulungan ngayon?`
            : `Hi ${firstName}, I'm Ebi. How may I help you today?`;

        setAssistantSessionStartedAt(now);
        setTemporarySessionMessages((existing) => [
          ...existing,
          {
            id: `temp-assistant-greeting-${now}`,
            sender: 'assistant',
            text: greetingText,
            createdAt: now,
          },
        ]);
      }
    } catch (err) {
      // non-fatal; don't block UI if greeting injection fails
      // eslint-disable-next-line no-console
      console.error('Failed to add assistant greeting', err);
    }
  }, [
    isAssistantOpen,
    visibleMessages.length,
    temporarySessionMessages.length,
    user?.id,
    user?.firstName,
    locale,
  ]);

  if (!user || user.role !== 'resident') return null;

  const startNewAssistantChat = () => {
    setAssistantSessionStartedAt(new Date().toISOString());
    setTemporarySessionMessages([]);
    setText('');
    setIsAssistantOpen(true);
  };

  const sendQuestion = async (value: string) => {
    if (!value || isSending) return;

    const residentMessageCreatedAt = new Date().toISOString();
    setTemporarySessionMessages((existing) => [
      ...existing,
      {
        id: `temp-resident-${residentMessageCreatedAt}-${existing.length}`,
        sender: 'resident',
        text: value,
        createdAt: residentMessageCreatedAt,
      },
    ]);

    setIsSending(true);
    try {
      const response = await sendChatMessage(value);
      setTemporarySessionMessages((existing) => [
        ...existing,
        {
          id: `temp-assistant-${response.assistantMessage.createdAt}-${existing.length}`,
          sender: response.assistantMessage.sender,
          text: response.assistantMessage.text,
          createdAt: response.assistantMessage.createdAt,
        },
      ]);
      setText('');
    } catch {
      const fallbackCreatedAt = new Date().toISOString();
      setTemporarySessionMessages((existing) => [
        ...existing,
        {
          id: `temp-assistant-fallback-${fallbackCreatedAt}-${existing.length}`,
          sender: 'assistant',
          text: copyText(
            locale,
            'The assistant is temporarily unavailable. Please try again later or continue using the correct service page.',
            'Pansamantalang hindi available ang assistant. Subukan ulit mamaya o magpatuloy sa tamang service page.'
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
    await sendQuestion(text.trim());
  };

  const onSubmitAssistantFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (assistantRating < 1) {
      setFeedbackStatus(copyText(locale, 'Please choose a rating first.', 'Pumili muna ng rating.'));
      return;
    }
    if (!assistantFeedback.trim()) {
      setFeedbackStatus(copyText(locale, 'Please add a short feedback note.', 'Maglagay ng maikling feedback note.'));
      return;
    }

    if (typeof window !== 'undefined') {
      const key = 'eserbisyo.assistant-feedback.v1';
      const raw = window.localStorage.getItem(key);
      const records = raw ? (JSON.parse(raw) as Array<{ rating: number; comment: string; createdAt: string }>) : [];
      records.unshift({
        rating: assistantRating,
        comment: assistantFeedback.trim(),
        createdAt: new Date().toISOString(),
      });
      window.localStorage.setItem(key, JSON.stringify(records));
    }

    setFeedbackStatus(copyText(locale, 'Feedback sent. Thank you!', 'Naipadala na ang feedback. Salamat!'));
    setAssistantFeedback('');
    setAssistantRating(0);
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsFeedbackOpen((previous) => !previous)}
        aria-expanded={isFeedbackOpen}
        aria-label={locale === 'fil' ? 'Buksan ang feedback form' : 'Open feedback form'}
        className="fixed bottom-40 right-4 z-[55] h-11 rounded-full px-4 shadow-[var(--resident-shadow-3)] md:bottom-20"
        variant="secondary"
      >
        <Star size={16} className="mr-2" />
        {copyText(locale, 'Feedback', 'Feedback')}
      </Button>

      <Button
        type="button"
        onClick={() => setIsAssistantOpen((previous) => !previous)}
        aria-expanded={isAssistantOpen}
        aria-label={locale === 'fil' ? 'Buksan ang eSerbisyo Chatbot' : 'Open eSerbisyo Chatbot'}
        className="fixed bottom-24 right-4 z-[55] h-12 rounded-full px-4 shadow-[var(--resident-shadow-3)] md:bottom-5"
        variant="resident"
      >
        <MessageCircle size={16} className="mr-2" />
        {locale === 'fil' ? 'eSerbisyo Chatbot' : 'eSerbisyo Chatbot'}
      </Button>

      {isFeedbackOpen ? (
        <div className="fixed bottom-56 right-4 z-[55] w-[min(92vw,380px)] rounded-[var(--resident-radius-lg)] border border-[color:var(--resident-border-soft)] bg-[color:rgba(255,255,255,0.98)] p-3 shadow-[var(--resident-shadow-3)] backdrop-blur md:bottom-36">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-heading text-sm font-semibold text-[color:var(--resident-ink-900)]">
              {copyText(locale, 'Assistant Feedback', 'Feedback sa Assistant')}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setIsFeedbackOpen(false)}
              aria-label={locale === 'fil' ? 'Isara ang feedback form' : 'Close feedback form'}
            >
              <X size={14} />
            </Button>
          </div>

          <form className="mb-3 grid gap-2 rounded-[var(--resident-radius-sm)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-3)] p-2.5" onSubmit={onSubmitAssistantFeedback}>
            <p className="text-xs font-semibold text-[color:var(--resident-ink-900)]">
              {copyText(locale, 'Rate this assistant', 'I-rate ang assistant na ito')}
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAssistantRating(value);
                    setFeedbackStatus('');
                  }}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full border transition-colors resident-focusable',
                    value <= assistantRating
                      ? 'border-[color:var(--resident-accent-strong)] bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]'
                      : 'border-[color:var(--resident-border-soft)] bg-white text-[color:var(--resident-ink-500)] hover:bg-[color:var(--resident-surface-1)]'
                  )}
                  aria-label={`${value} star${value > 1 ? 's' : ''}`}
                >
                  <Star size={14} />
                </button>
              ))}
            </div>
            <Textarea
              value={assistantFeedback}
              onChange={(event) => {
                setAssistantFeedback(event.target.value);
                setFeedbackStatus('');
              }}
              className="min-h-[64px]"
              placeholder={copyText(locale, 'Tell us how the assistant can improve...', 'Sabihin kung paano pa mapapabuti ang assistant...')}
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="submit" size="sm" className="h-8 px-3" variant="residentOutline" disabled={isSending}>
                {copyText(locale, 'Send feedback', 'Ipadala ang feedback')}
              </Button>
              {feedbackStatus ? <p className="text-xs text-[color:var(--resident-ink-700)]">{feedbackStatus}</p> : null}
            </div>
          </form>
        </div>
      ) : null}

      {isAssistantOpen ? (
        <div className="fixed bottom-40 right-4 z-[55] flex h-[min(70vh,32rem)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-[var(--resident-radius-lg)] border border-[color:var(--resident-border-soft)] bg-[color:rgba(255,255,255,0.98)] p-3 shadow-[var(--resident-shadow-3)] backdrop-blur md:bottom-20">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-heading text-sm font-semibold text-[color:var(--resident-ink-900)]">
              {copyText(locale, 'eSerbisyo Chatbot', 'eSerbisyo Chatbot')}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setIsAssistantOpen(false)}
              aria-label={locale === 'fil' ? 'Isara ang eSerbisyo Chatbot' : 'Close eSerbisyo Chatbot'}
            >
              <X size={14} />
            </Button>
          </div>

          <div className="flex flex-1 flex-col min-h-0 gap-2 overflow-y-auto pb-1 px-3">
            {visibleMessages.length ? (
              visibleMessages.map((message) => {
                const isResident = message.sender === 'resident';
                const sections = isResident ? null : parseAssistantSections(message.text);

                const bubbleBase = 'text-sm leading-5 max-w-[72%] break-words px-4 py-2';
                const bubbleClass = isResident
                  ? 'self-end rounded-2xl bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]'
                  : 'self-start rounded-2xl bg-[color:rgba(252,254,253,0.94)] text-[color:#123726] border border-[color:rgba(18,56,40,0.06)]';

                return (
                  <div key={message.id} className={cn('flex flex-col', isResident ? 'items-end' : 'items-start')}>
                    <p className="text-[10px] text-[color:var(--resident-ink-600)] mb-1">
                      {isResident ? copyText(locale, 'You', 'Ikaw') : 'Ebi'}
                    </p>

                    {isResident ? (
                      <div className={cn(bubbleClass, bubbleBase)}>{message.text}</div>
                    ) : sections ? (
                      <div className={cn(bubbleClass, bubbleBase)}>
                        <div className="grid gap-2.5">
                          <div className="rounded-lg bg-[color:rgba(252,254,253,0.98)] px-2.5 py-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--resident-ink-600)]">
                              {copyText(locale, 'Summary', 'Buod')}
                            </p>
                            <p className="mt-1 text-[color:#123726]">{emphasizeUiTerms(sections.summary)}</p>
                          </div>

                          <div>
                            <ol className="grid gap-1">
                              {sections.steps.map((step, index) => (
                                <li key={`${message.id}-step-${index}`} className="flex items-start gap-2">
                                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[color:var(--resident-accent-strong)]" />
                                  <span className="text-[color:#123726]">{emphasizeUiTerms(step)}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {sections.reminder ? (
                            <div className="flex items-start gap-2 rounded-lg bg-[color:rgba(255,248,231,0.86)] px-2.5 py-1">
                              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[color:#9d6516]" />
                              <p className="text-[color:#7f4d0f]"><span className="font-semibold">{copyText(locale, 'Reminder:', 'Paalala:')}</span> {emphasizeUiTerms(sections.reminder)}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className={cn(bubbleClass, bubbleBase)}>{message.text}</div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="rounded-[var(--resident-radius-sm)] border border-dashed border-[color:var(--resident-border-strong)] bg-[color:var(--resident-surface-3)] px-3 py-4 text-sm text-[color:var(--resident-ink-700)]">
                {copyText(locale, 'No messages yet. Start a conversation.', 'Wala pang mensahe. Magsimula ng usapan.')}
              </p>
            )}
            {isSending ? (
              <AssistantThinkingIndicator compact label={copyText(locale, 'Ebi is thinking', 'Nag-iisip si Ebi')} />
            ) : null}
            <div ref={assistantMessagesEndRef} aria-hidden="true" />
          </div>

          <div className="mt-2 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={copyText(locale, 'Frequently asked questions', 'Mga madalas itanong')}>
            {RESIDENT_CHATBOT_FAQS.map((faq) => (
              <button
                key={faq.id}
                type="button"
                onClick={() => void sendQuestion(locale === 'fil' ? faq.fil : faq.en)}
                disabled={isSending}
                className="resident-focusable shrink-0 rounded-full border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] px-3 py-2 text-left text-xs font-medium leading-4 text-[color:var(--resident-ink-800)] transition-colors hover:border-[color:var(--resident-accent-strong)] hover:bg-[color:var(--resident-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {locale === 'fil' ? faq.fil : faq.en}
              </button>
            ))}
          </div>

          <form className="mt-3 grid gap-2" onSubmit={onSubmit}>
            <label className="grid gap-1 text-xs text-[color:var(--resident-ink-700)]">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                required
                disabled={isSending}
                className="min-h-[78px]"
                placeholder={copyText(locale, 'Type your question...', 'I-type ang tanong mo...')}
              />
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="residentOutline" className="h-9 flex-1 justify-center" onClick={startNewAssistantChat}>
                <Trash2 size={14} className="mr-2" />
                {copyText(locale, 'New chat', 'Bagong chat')}
              </Button>
              <Button type="submit" variant="resident" disabled={isSending || !text.trim()} className="h-9 flex-1 justify-center opacity-100">
                <Send size={14} className="mr-2" />
                {copyText(locale, 'Send', 'Ipadala')}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function ResidentReleaseFeedbackPrompt() {
  const { state, user, locale } = useAppState();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const eligibleRequestIds = useMemo(() => {
    if (!user?.id) return [] as string[];

    const generatedRequestIds = new Set(
      state.generatedDocuments
        .map((item) => item.requestId)
        .filter((item): item is string => Boolean(item))
    );
    const feedbackRequestIds = new Set(
      state.feedback
        .filter((item) => item.residentId === user.id)
        .map((item) => item.requestId)
    );

    return state.documentRequests
      .filter(
        (item) =>
          item.residentId === user.id &&
          item.status === 'completed' &&
          generatedRequestIds.has(item.id) &&
          !item.feedbackPromptedAt &&
          !feedbackRequestIds.has(item.id)
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((item) => item.id);
  }, [state.documentRequests, state.feedback, state.generatedDocuments, user?.id]);

  useEffect(() => {
    if (!eligibleRequestIds.length) {
      if (activeRequestId) setActiveRequestId(null);
      return;
    }
    if (!activeRequestId || !eligibleRequestIds.includes(activeRequestId)) {
      setActiveRequestId(eligibleRequestIds[0]);
      setRating(0);
      setComment('');
      setMessage('');
    }
  }, [activeRequestId, eligibleRequestIds]);

  const activeRequest = state.documentRequests.find((item) => item.id === activeRequestId) ?? null;
  if (!activeRequest) return null;

  const acknowledgeAndClose = async () => {
    await acknowledgeDocumentRequestFeedbackPrompt(activeRequest.id);
    setActiveRequestId(null);
    setRating(0);
    setComment('');
    setMessage('');
  };

  const onSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (rating < 1) {
      setMessage(copyText(locale, 'Please choose a rating first.', 'Pumili muna ng rating.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await addFeedback({
        requestId: activeRequest.id,
        rating,
        comment: comment.trim() || undefined,
      });
      await acknowledgeAndClose();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : copyText(locale, 'Unable to submit feedback right now.', 'Hindi maisumite ang feedback ngayon.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4">
      <Card className="w-full max-w-[560px] rounded-[var(--resident-radius-lg)] border-[color:var(--resident-border-soft)] p-5">
        <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">
          {copyText(locale, 'Feedback', 'Feedback')}
        </p>
        <p className="mt-2 text-base font-semibold text-[color:var(--resident-ink-900)]">
          {copyText(locale, 'How was your released document request?', 'Kumusta ang iyong na-release na document request?')}
        </p>
        <p className="mt-1 text-sm text-[color:var(--resident-ink-700)]">
          {copyText(locale, 'Reference', 'Reference')}: {activeRequest.referenceNumber}
        </p>

        <form className="mt-4 grid gap-3" onSubmit={onSubmitFeedback}>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold',
                  value <= rating
                    ? 'border-[color:var(--resident-accent-strong)] bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]'
                    : 'border-[color:var(--resident-border-soft)] bg-white text-[color:var(--resident-ink-500)]'
                )}
                onClick={() => {
                  setRating(value);
                  setMessage('');
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[color:var(--resident-ink-900)]">{copyText(locale, 'Comment (optional)', 'Komento (opsyonal)')}</span>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="min-h-[96px]"
              placeholder={copyText(locale, 'Share your experience to help improve services.', 'Ibahagi ang karanasan para mapahusay ang serbisyo.')}
            />
          </label>
          {message ? <p className="text-xs text-[color:#9c2b2b]">{message}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => void acknowledgeAndClose()} disabled={isSubmitting}>
              {copyText(locale, 'Dismiss', 'Isara')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {copyText(locale, 'Submit feedback', 'Ipadala ang feedback')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function ResidentNotificationBell() {
  const { state, user, locale } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [summaryRequestId, setSummaryRequestId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const notifications = useMemo(() => {
    return getResidentNotifications(state, user?.id)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state, user?.id]);
  const latestNotifications = notifications.slice(0, 8);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const summaryRequest = state.documentRequests.find((item) => item.id === summaryRequestId) ?? null;

  const onNotificationItemClick = async (notificationId: string, entityType?: string, entityId?: string) => {
    await markNotificationRead(notificationId);
    if (entityType === 'document_request' && entityId) {
      setSummaryRequestId(entityId);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="resident-notifications-panel"
        aria-label={
          locale === 'fil'
            ? `Buksan ang mga abiso${unreadCount ? `, ${unreadCount} na hindi pa nababasa` : ''}`
            : `Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`
        }
        className="relative border-2 border-[color:rgba(237,248,243,0.5)] bg-[color:rgba(255,255,255,0.08)] px-3 text-[color:var(--resident-shell-text)] shadow-[0_2px_8px_rgba(4,22,15,0.28)] hover:bg-[color:rgba(255,255,255,0.16)] resident-focusable"
      >
        <Bell size={14} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-[color:#f4b25c] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[color:#1a221d]">
            {unreadLabel}
            <span className="sr-only">
              {locale === 'fil' ? `${unreadCount} na hindi pa nababasa` : `${unreadCount} unread notifications`}
            </span>
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div
          id="resident-notifications-panel"
          ref={panelRef}
          role="dialog"
          aria-label={locale === 'fil' ? 'Mga abiso' : 'Notifications'}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-[min(94vw,360px)] overflow-hidden rounded-[var(--resident-radius-lg)] border border-[color:rgba(237,248,243,0.22)] bg-[color:rgba(9,36,27,0.98)] shadow-[var(--resident-shadow-3)]"
        >
          <div className="flex items-center justify-between border-b border-[color:rgba(237,248,243,0.18)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[color:var(--resident-shell-text)]">
              {copyText(locale, 'Notifications', 'Mga Abiso')}
            </p>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-[color:#f4b25c] px-2 py-0.5 text-xs font-semibold text-[color:#1a221d]">
                {unreadLabel}
                <span className="sr-only">
                  {locale === 'fil' ? `${unreadCount} na hindi pa nababasa` : `${unreadCount} unread notifications`}
                </span>
              </span>
            ) : null}
          </div>

          <div className="max-h-[min(62vh,460px)] overflow-y-auto p-2">
            {latestNotifications.length ? (
              <ul className="grid gap-1.5" role="menu" aria-label={locale === 'fil' ? 'Listahan ng mga abiso' : 'Notifications list'}>
                {latestNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        'w-full rounded-[var(--resident-radius-sm)] border px-2.5 py-2 text-left transition-colors resident-focusable',
                        notification.read
                          ? 'border-[color:rgba(237,248,243,0.08)] bg-[color:rgba(255,255,255,0.02)] text-[color:rgba(237,248,243,0.88)] hover:bg-[color:rgba(255,255,255,0.06)]'
                          : 'border-[color:rgba(244,178,92,0.38)] bg-[color:rgba(244,178,92,0.12)] text-[color:#fef6e8] hover:bg-[color:rgba(244,178,92,0.2)]'
                      )}
                      onClick={() => {
                        void onNotificationItemClick(notification.id, notification.entityType, notification.entityId);
                      }}
                      aria-label={
                        locale === 'fil'
                          ? `${notification.title}. ${notification.read ? 'Nabasa na' : 'Hindi pa nababasa'}.`
                          : `${notification.title}. ${notification.read ? 'Read' : 'Unread'}.`
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{notification.title}</p>
                        {!notification.read ? (
                          <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:#f4b25c]" aria-hidden />
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[inherit]/85">{notification.message}</p>
                      <p className="mt-1.5 text-[11px] text-[inherit]/70">{formatDateTime(notification.createdAt, locale)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[var(--resident-radius-sm)] border border-dashed border-[color:rgba(237,248,243,0.24)] px-3 py-4 text-sm text-[color:rgba(237,248,243,0.82)]">
                {copyText(locale, 'No notifications yet.', 'Wala pang mga abiso.')}
              </p>
            )}
          </div>

          <div className="border-t border-[color:rgba(237,248,243,0.18)] px-3 py-2.5">
            <Link
              href="/resident/notifications"
              className="text-xs font-semibold text-[color:#f4b25c] underline-offset-2 hover:underline focus-visible:underline resident-focusable"
              aria-label={locale === 'fil' ? 'Tingnan ang lahat ng abiso' : 'See all notifications'}
            >
              {copyText(locale, 'See all', 'Tingnan lahat')}
            </Link>
          </div>
        </div>
      ) : null}
      <DocumentRequestSummaryModal
        open={Boolean(summaryRequest)}
        requestItem={summaryRequest}
        locale={locale}
        onClose={() => setSummaryRequestId(null)}
      />
    </div>
  );
}

export function ResidentShell({
  title,
  description,
  children,
  showHero = true,
}: {
  title: string | LocalizedCopy;
  description: string | LocalizedCopy;
  children: React.ReactNode;
  showHero?: boolean;
}) {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarItems = useMemo(() => getResidentSidebarItems(), []);
  const mobileSidebarItems = useMemo(() => getResidentMobileSidebarItems(), []);
  const sidebarSections = useMemo(
    () =>
      residentSidebarSections.map((section) => ({
        ...section,
        items: sidebarItems.filter((item) => item.group === section.id),
      })),
    [sidebarItems]
  );

  const resolveIcon = (href: string) => {
    if (href.includes('dashboard')) return LayoutDashboard;
    if (href.includes('document-requests')) return FileText;
    if (href.includes('blotter') || href.includes('incident')) return Siren;
    if (href.includes('notifications')) return Bell;
    if (href.includes('announcements')) return Megaphone;
    return UserRound;
  };
  return (
    <PortalShellBase role="resident">
      {({ user, locale, setLocale, logoutAndRedirect }) => {
        const headline = copy(locale, title);
        const supportingText = copy(locale, description);
        const dashboardHref = '/resident/dashboard';
        const isDashboardView = pathname === dashboardHref || pathname.startsWith(`${dashboardHref}/`);

        const handleLogout = () => {
          setShowLogoutConfirm(true);
        };

        const handleConfirmLogout = () => {
          setShowLogoutConfirm(false);
          logoutAndRedirect();
        };

        const handleCancelLogout = () => {
          setShowLogoutConfirm(false);
        };

        return (
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6faf7_0%,#eef4f0_42%,#e6efea_100%)] text-[color:var(--resident-ink-900)]">
            <header className="sticky top-0 z-40 border-b border-[color:var(--portal-shell-border)] bg-[color:rgba(13,53,38,0.94)] text-[color:var(--portal-shell-text)] backdrop-blur">
              <div className="mx-auto flex min-h-[104px] w-full max-w-[1560px] items-center justify-between gap-3 px-4 py-3 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src="/images/progreso.PNG"
                    alt="eSerbisyo logo"
                    width={66}
                    height={66}
                    sizes="66px"
                    className="h-[66px] w-[66px] object-contain"
                    unoptimized
                    priority
                  />
                  <div className="min-w-0">
                    <p className="flex flex-col items-start font-heading text-sm font-semibold leading-tight">
                      <span className="text-[2rem] font-serif">eSerbisyo</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-shell-muted)]">
                        {locale === 'fil' ? 'Resident Workspace' : 'Resident Workspace'} | Service and Record Management System
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-2">
                  <ResidentNotificationBell />
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setLocale(locale === 'en' ? 'fil' : 'en')}
                    className="border-[color:rgba(237,248,243,0.32)] bg-transparent text-[color:var(--portal-shell-text)] hover:bg-[color:rgba(255,255,255,0.12)] portal-focusable text-xs sm:text-sm px-2.5 sm:px-3"
                  >
                    <Globe size={14} className="mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">{locale === 'en' ? 'English' : 'Filipino'}</span>
                    <span className="sm:hidden">{locale === 'en' ? 'EN' : 'FIL'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    type="button"
                    aria-label={isMobileMenuOpen ? (locale === 'fil' ? 'Isara ang Menu' : 'Close Menu') : (locale === 'fil' ? 'Buksan ang Menu' : 'Open Menu')}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="border-[color:rgba(237,248,243,0.32)] bg-transparent text-[color:var(--portal-shell-text)] hover:bg-[color:rgba(255,255,255,0.12)] portal-focusable lg:hidden px-2.5"
                  >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </Button>
                </div>
              </div>
            </header>

            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="relative z-10 flex w-[280px] sm:w-[320px] flex-col bg-[color:var(--portal-surface-1)] p-4 shadow-2xl overflow-y-auto max-h-screen">
                  <div className="flex items-center justify-between border-b border-[color:var(--portal-border-soft)] pb-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/images/progreso.PNG"
                        alt="eSerbisyo logo"
                        width={38}
                        height={38}
                        className="h-9 w-9 object-contain"
                        unoptimized
                      />
                      <div className="flex flex-col">
                        <span className="font-serif text-lg font-bold leading-tight">eSerbisyo</span>
                        <span className="text-[10px] text-[color:var(--portal-ink-500)] uppercase font-semibold">
                          {locale === 'fil' ? 'Resident Workspace' : 'Resident Workspace'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="h-8 w-8 p-0 rounded-full hover:bg-[color:var(--portal-surface-3)]"
                    >
                      <X size={18} />
                    </Button>
                  </div>

                  <div className="my-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)] px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.09em] text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Naka-login bilang' : 'Signed in as'}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[color:var(--portal-ink-900)]">{user.email}</p>
                  </div>

                  <nav className="grid gap-3" aria-label="Mobile resident navigation">
                    {sidebarSections.map((section) => (
                      <div key={section.id} className="rounded-[16px] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-2">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--portal-ink-500)]">
                          {copy(locale, section.label)}
                        </div>
                        <div className="mt-1 grid gap-1 border-t border-[color:var(--portal-border-soft)] pt-1.5">
                          {section.items.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            const Icon = resolveIcon(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                                  isActive
                                    ? 'bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-ink-900)] font-semibold'
                                    : 'text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)]'
                                )}
                              >
                                <Icon size={16} />
                                <span>{copy(locale, item.label)}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>

                  <div className="mt-auto pt-4 border-t border-[color:var(--portal-border-soft)]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center justify-start gap-2 rounded-[var(--portal-radius-md)] px-3 py-2 text-sm font-semibold text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)]"
                    >
                      <LogOut size={16} />
                      <span>{locale === 'fil' ? 'Mag-logout' : 'Logout'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-auto w-full max-w-[1560px] px-3 py-4 md:px-6 md:py-5">
              <div className="portal-shell-layout grid gap-4 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start lg:gap-5">
                <aside className="portal-shell-sidebar hidden min-w-0 rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3 shadow-[var(--portal-shadow-1)] lg:sticky lg:top-[88px] lg:flex lg:flex-col lg:max-h-[calc(100vh-108px)] lg:overflow-y-auto">
                  <div className="mb-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)] px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.09em] text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Naka-login bilang' : 'Signed in as'}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[color:var(--portal-ink-900)]">{user.email}</p>
                  </div>

                  <nav className="grid gap-3" aria-label="Resident navigation">
                    {sidebarSections.map((section) => {
                      const hasActiveRoute = section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
                      const sectionBodyId = `resident-nav-section-${section.id}`;

                      return (
                        <div
                          key={section.id}
                          className={cn(
                            'rounded-[18px] border bg-[color:var(--portal-surface-1)] p-2 shadow-[0_1px_0_rgba(14,47,34,0.03)]',
                            hasActiveRoute ? 'border-[color:rgba(47,143,104,0.28)]' : 'border-[color:var(--portal-border-soft)]'
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-[14px] px-2.5 py-2 text-[11px] uppercase tracking-[0.12em]',
                              hasActiveRoute ? 'bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-ink-900)]' : 'text-[color:var(--portal-ink-500)] hover:bg-[color:var(--portal-surface-3)]'
                            )}
                          >
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full',
                                hasActiveRoute ? 'bg-[color:var(--portal-accent-strong)]' : 'bg-[color:var(--portal-ink-300)]'
                              )}
                              aria-hidden
                            />
                            <span>{copy(locale, section.label)}</span>
                          </div>
                          <div id={sectionBodyId} className="mt-2 grid gap-1.5 border-t border-[color:var(--portal-border-soft)] pt-2">
                            {section.items.map((item) => {
                              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                              const Icon = resolveIcon(item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className={cn(
                                    'relative flex items-center gap-2 rounded-[var(--portal-radius-md)] px-2.5 py-2 transition-all duration-200 portal-focusable',
                                    isActive
                                      ? 'bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-ink-900)] ring-1 ring-[color:rgba(47,143,104,0.28)]'
                                      : 'text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)]'
                                  )}
                                  aria-current={isActive ? 'page' : undefined}
                                >
                                  <span
                                    className={cn(
                                      'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-transparent transition-all duration-200',
                                      isActive ? 'bg-[color:var(--portal-accent-strong)]' : 'bg-transparent'
                                    )}
                                    aria-hidden
                                  />
                                  <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[color:var(--portal-surface-3)] text-[color:inherit]">
                                    <Icon size={16} />
                                  </span>
                                  <span className="text-sm font-semibold leading-tight">{copy(locale, item.label)}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>

                  <div className="mt-auto pt-3 border-t border-[color:var(--portal-border-soft)]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleLogout}
                      className="portal-interactive-lift flex w-full items-center justify-start gap-2 rounded-[var(--portal-radius-md)] px-3 py-2 text-sm font-semibold text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)] portal-focusable"
                    >
                      <LogOut size={14} />
                      <span>{locale === 'fil' ? 'Mag-logout' : 'Logout'}</span>
                    </Button>
                  </div>
                </aside>

                <section className="grid min-w-0 content-start gap-4 pb-16 md:gap-5 lg:pb-8">
                  {showHero ? (
                    <div className="resident-motion relative overflow-hidden rounded-[var(--resident-radius-xl)] border border-[color:rgba(15,45,32,0.12)] bg-[linear-gradient(180deg,#f9fcfa_0%,#edf5f0_100%)] shadow-[var(--resident-shadow-2)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#1b6145_0%,#2f8f68_55%,#71b79a_100%)]" />

                      <div className="relative z-10 px-4 py-5 md:px-6 md:py-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0 max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(29,95,71,0.18)] bg-[color:rgba(255,255,255,0.75)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[color:var(--resident-accent-strong)] mb-3">
                              <ShieldCheck size={12} />
                              {locale === 'fil' ? 'Resident Workspace' : 'Resident Workspace'}
                            </div>

                            <h1 className="mt-0 font-heading text-[clamp(1.9rem,3vw,3.35rem)] font-semibold leading-[1.02] text-[color:var(--resident-ink-900)]">
                              {headline}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--resident-ink-700)]">
                              {supportingText}
                            </p>
                          </div>

                          {/* no hero actions for resident as requested */}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <main className="grid gap-4 md:gap-5">{children}</main>
                </section>
              </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--resident-border-soft)] bg-[color:rgba(255,255,255,0.96)] px-3 py-2 backdrop-blur md:hidden">
              <div className="mx-auto flex w-full max-w-[560px] gap-2">
                <Button asChild className="h-11 w-full flex-1 resident-focusable">
                  <Link href="/resident/document-requests">{locale === 'fil' ? 'Bagong Kahilingan' : 'New Request'}</Link>
                </Button>
                <Button asChild variant="secondary" className="h-11 w-full flex-1 border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-3)] resident-focusable">
                  <Link href="/resident/notifications">{locale === 'fil' ? 'Mga Update' : 'Updates'}</Link>
                </Button>
              </div>
            </div>
            <ResidentReleaseFeedbackPrompt />
            {!showLogoutConfirm && <ResidentFloatingAssistant />}

            {showLogoutConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="mx-4 w-full max-w-sm rounded-[var(--resident-radius-xl)] border border-[color:var(--resident-border-soft)] bg-white p-6 shadow-[var(--resident-shadow-3)]">
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-semibold text-[color:var(--resident-ink-900)]">
                      {locale === 'fil' ? 'Kumpirmahin ang Logout' : 'Confirm Logout'}
                    </h3>
                    <p className="mt-2 text-sm text-[color:var(--resident-ink-700)]">
                      {locale === 'fil' ? 'Sigurado ka bang gusto mong mag-logout?' : 'Are you sure you want to logout?'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <Button
                      type="button"
                      variant="residentOutline"
                      onClick={handleCancelLogout}
                      className="flex-1"
                    >
                      {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
                    </Button>
                    <Button
                      type="button"
                      variant="resident"
                      onClick={handleConfirmLogout}
                      className="flex-1"
                    >
                      {locale === 'fil' ? 'Oo' : 'OK'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </PortalShellBase>
  );
}
