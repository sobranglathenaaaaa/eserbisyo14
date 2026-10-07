'use client';

import { useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

type DetailItem = {
  label: string;
  value: React.ReactNode;
};

type DetailGroup = {
  title: string;
  items: DetailItem[];
};

type RegistrationReviewModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  detailsTitle: string;
  detailGroups: DetailGroup[];
  verificationTitle: string;
  frontLabel: string;
  backLabel: string;
  frontPreviewUrl: string | null;
  backPreviewUrl: string | null;
  frontPreviewAlt: string;
  backPreviewAlt: string;
  frontPreviewUnavailableText: string;
  backPreviewUnavailableText: string;
  onFrontPreviewError?: () => void;
  onBackPreviewError?: () => void;
  onFrontPreviewClick?: () => void;
  onBackPreviewClick?: () => void;
  noteLabel: string;
  notePlaceholder: string;
  noteValue: string;
  onNoteChange: (value: string) => void;
  noteDisabled?: boolean;
  actions: React.ReactNode;
  footerNote?: React.ReactNode;
  secondaryMessage?: React.ReactNode;
};

export default function RegistrationReviewModal({
  open,
  title,
  onClose,
  detailsTitle,
  detailGroups,
  verificationTitle,
  frontLabel,
  backLabel,
  frontPreviewUrl,
  backPreviewUrl,
  frontPreviewAlt,
  backPreviewAlt,
  frontPreviewUnavailableText,
  backPreviewUnavailableText,
  onFrontPreviewError,
  onBackPreviewError,
  onFrontPreviewClick,
  onBackPreviewClick,
  noteLabel,
  notePlaceholder,
  noteValue,
  onNoteChange,
  noteDisabled = false,
  actions,
  footerNote,
  secondaryMessage,
}: RegistrationReviewModalProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 sm:p-4 md:p-6 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex w-full max-w-full sm:max-w-5xl max-h-[90vh] sm:max-h-[88vh] flex-col overflow-hidden rounded-[20px] sm:rounded-[28px] border border-[color:var(--portal-border-soft)] bg-[#f0fdf4] shadow-[0_24px_80px_rgba(7,45,25,0.22)] min-w-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 relative flex items-center justify-center bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 py-4 text-white">
          <h3 className="text-center text-[1.2rem] font-semibold tracking-tight text-white sm:text-[1.5rem]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-2xl leading-none text-white transition hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] min-w-0 w-full">
            <section className="flex flex-col gap-2 min-w-0 w-full">
              <h4 className="border-b border-[color:rgba(0,0,0,0.08)] pb-2 text-base sm:text-lg font-semibold text-[color:var(--portal-ink-900)]">
                {detailsTitle}
              </h4>
              <div className="rounded-[18px] sm:rounded-[22px] border-2 border-[#1a6b4f] bg-white p-3.5 sm:p-5 min-w-0 w-full shadow-xs">
                <div className="flex flex-col gap-3.5 sm:gap-4 border-l-2 border-[color:#e8f7ef] pl-2.5 sm:pl-4 min-w-0 w-full">
                  {detailGroups.map((group) => (
                    <div key={group.title} className="grid gap-1 min-w-0 w-full">
                      <h5 className="text-[0.74rem] font-semibold uppercase tracking-wide text-[#1a6b4f]">
                        {group.title}
                      </h5>
                      <div className="grid gap-1.5 min-w-0 w-full">
                        {group.items.map((item) => (
                          <p key={item.label} className="m-0 text-sm sm:text-[0.98rem] leading-6 text-[color:var(--portal-ink-900)] break-words [overflow-wrap:anywhere] min-w-0">
                            <span className="text-[color:var(--portal-ink-600)]">{item.label}:</span>{' '}
                            <strong className="font-semibold text-[color:var(--portal-ink-900)] break-words [overflow-wrap:anywhere]">{item.value}</strong>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          <section className="flex flex-col gap-3 min-w-0 w-full overflow-hidden">
            <h4 className="border-b border-[color:rgba(0,0,0,0.08)] pb-2 text-base sm:text-lg font-semibold text-[color:var(--portal-ink-900)]">
              {verificationTitle}
            </h4>

            <div className="grid gap-4 min-w-0 w-full">
              <div className="min-w-0 w-full">
                <p className="mb-2 text-sm text-[color:var(--portal-ink-600)]">{frontLabel}</p>
                {frontPreviewUrl ? (
                  <div className="overflow-hidden rounded-2xl border-2 border-[#1a6b4f] bg-white">
                    <img
                      src={frontPreviewUrl}
                      alt={frontPreviewAlt}
                      className="h-[160px] w-full cursor-pointer object-cover object-center transition hover:opacity-90"
                      style={{ height: '160px', width: '100%', objectFit: 'cover', objectPosition: 'center' }}
                      onError={onFrontPreviewError}
                      onClick={onFrontPreviewClick}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--portal-border-soft)] bg-white px-3 py-4 text-sm text-[color:var(--portal-ink-500)] break-words">
                    {frontPreviewUnavailableText}
                  </div>
                )}
              </div>

              <div className="min-w-0 w-full">
                <p className="mb-2 text-sm text-[color:var(--portal-ink-600)]">{backLabel}</p>
                {backPreviewUrl ? (
                  <div className="overflow-hidden rounded-2xl border-2 border-[#1a6b4f] bg-white">
                    <img
                      src={backPreviewUrl}
                      alt={backPreviewAlt}
                      className="h-[160px] w-full cursor-pointer object-cover object-center transition hover:opacity-90"
                      style={{ height: '160px', width: '100%', objectFit: 'cover', objectPosition: 'center' }}
                      onError={onBackPreviewError}
                      onClick={onBackPreviewClick}
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--portal-border-soft)] bg-white px-3 py-4 text-sm text-[color:var(--portal-ink-500)] break-words">
                    {backPreviewUnavailableText}
                  </div>
                )}
              </div>

              <p className="text-center text-[0.85rem] italic text-[color:var(--portal-ink-500)]">Tap images to zoom</p>

              <label className="grid gap-1 text-sm min-w-0 w-full">
                <span className="font-medium text-[color:var(--portal-ink-900)]">{noteLabel}</span>
                <textarea
                  value={noteValue}
                  onChange={(event) => onNoteChange(event.target.value)}
                  placeholder={notePlaceholder}
                  disabled={noteDisabled}
                  rows={3}
                  className="min-h-[88px] w-full min-w-0 rounded-xl border border-[color:var(--portal-border-soft)] bg-white px-3 py-2 text-sm text-[color:var(--portal-ink-900)] outline-none transition placeholder:text-[color:var(--portal-ink-400)] focus:border-[#1a6b4f] focus:ring-2 focus:ring-[#1a6b4f]/15 disabled:cursor-not-allowed disabled:bg-[color:var(--portal-border-soft)] disabled:opacity-100"
                />
              </label>

              {secondaryMessage ? <div className="min-w-0 w-full">{secondaryMessage}</div> : null}

              <div className="flex flex-wrap gap-2 justify-center min-w-0 w-full">{actions}</div>

              {footerNote ? <div className="pt-1 text-xs text-[color:var(--portal-ink-500)] min-w-0 w-full">{footerNote}</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
);
}