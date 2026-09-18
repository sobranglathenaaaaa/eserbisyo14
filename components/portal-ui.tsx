import Link from 'next/link';
import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UIStatusTone } from '@/lib/types/ui';
import { cn } from '@/lib/utils';

// Action ownership rule:
// - Shell components own global navigation and global quick actions.
// - Page/dashboard sections should keep contextual/task-specific actions only.
export function StatusBadge({ tone, children }: { tone: UIStatusTone; children: ReactNode }) {
  return <Badge variant={tone}>{children}</Badge>;
}

export function EmptyState({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className='rounded-[var(--portal-radius-md)] border border-dashed border-[color:var(--portal-border-strong)] bg-[color:var(--portal-surface-3)] p-5 text-center'>
      <h3 className='font-heading text-base font-semibold text-[color:var(--portal-ink-900)]'>{title}</h3>
      <p className='mt-2 text-sm text-[color:var(--portal-ink-700)]'>{description}</p>
      {actions ? <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FormFeedback({ tone, text }: { tone: 'success' | 'error' | 'info' | 'neutral'; text: string }) {
  const toneClasses = {
    success: 'border-[color:var(--status-success-text)]/30 bg-[color:var(--status-success-bg)] text-[color:var(--status-success-text)]',
    error: 'border-[color:var(--status-danger-text)]/30 bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-text)]',
    info: 'border-[color:var(--status-info-text)]/30 bg-[color:var(--status-info-bg)] text-[color:var(--status-info-text)]',
    neutral: 'border-[color:var(--status-neutral-text)]/30 bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-text)]',
  } as const;

  return (
    <Alert className={cn('mt-3', toneClasses[tone])} role="status" aria-live="polite">
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}

export function InfoNotice({ title, description }: { title: string; description: string }) {
  return (
    <Alert className='border-[color:var(--status-info-text)]/35 bg-white'>
      <AlertTitle className='text-sm text-[color:var(--text-900)]'>{title}</AlertTitle>
      <AlertDescription className='text-[color:var(--text-700)]'>{description}</AlertDescription>
    </Alert>
  );
}

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className,
  density = 'comfortable',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  density?: 'comfortable' | 'compact';
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbf8_100%)] shadow-[var(--portal-shadow-1)]',
        density === 'compact' ? 'p-4 md:p-4' : 'p-5 md:p-6',
        className
      )}
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold text-[color:var(--portal-ink-900)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className={density === 'compact' ? 'mt-3' : 'mt-4'}>{children}</div>
    </section>
  );
}

export function DashboardSummaryCard({
  label,
  value,
  icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[linear-gradient(140deg,#ffffff_0%,#edf6f1_100%)] px-5 py-4 shadow-[var(--portal-shadow-1)] sm:flex-row sm:items-center',
        className
      )}
    >
      {icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-accent-strong)]">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--portal-ink-500)]">{label}</p>
        <p className="mt-1 font-heading text-3xl font-semibold text-[color:var(--portal-ink-900)]">{value}</p>
        {hint ? <p className="text-xs text-[color:var(--portal-ink-700)]">{hint}</p> : null}
      </div>
    </div>
  );
}

export function ActionCenterBanner({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-[var(--portal-radius-md)] border border-[color:#e0bf97] bg-[linear-gradient(140deg,#fff5e6_0%,#ffe6cc_100%)] px-4 py-3 text-[color:#5c3413] shadow-[var(--portal-shadow-1)] sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mt-1 text-xs text-[color:#704319]">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function QuickActionTile({
  title,
  description,
  href,
  icon,
  className,
}: {
  title: string;
  description?: string;
  href: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group grid gap-2 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] px-5 py-4 text-left shadow-[var(--portal-shadow-1)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--portal-accent-soft)] hover:shadow-[var(--portal-shadow-2)] portal-focusable',
        className
      )}
    >
      {icon ? (
        <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-accent-strong)]">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{title}</p>
        {description ? <p className="mt-1 text-xs text-[color:var(--portal-ink-700)]">{description}</p> : null}
      </div>
    </Link>
  );
}

export function PageGuide({
  title,
  summary,
  steps,
  cta,
  tone = 'portal',
  className,
}: {
  title: string;
  summary: string;
  steps: string[];
  cta?: { label: string; href: string };
  tone?: 'portal' | 'resident';
  className?: string;
}) {
  return null;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('grid min-w-0 gap-4', className)}>
      <header className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='grid min-w-0 gap-1'>
          <CardTitle>{title}</CardTitle>
          {description ? <p className='text-sm text-[color:var(--text-700)]'>{description}</p> : null}
        </div>
        {actions ? <div className='flex flex-wrap gap-2'>{actions}</div> : null}
      </header>
      {children}
    </Card>
  );
}

export function FieldLabel({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('grid min-w-0 gap-2 text-sm', className)}>
      <span className='font-medium text-[color:var(--text-900)]'>{label}</span>
      {children}
      {hint ? <span className='text-xs text-[color:var(--text-700)] [overflow-wrap:anywhere]'>{hint}</span> : null}
    </label>
  );
}

export function statusToneFromState(value: string): UIStatusTone {
  const normalized = value.toLowerCase();
  if (['completed', 'approved', 'resolved', 'read', 'available', 'active'].includes(normalized)) return 'success';
  if (['declined', 'cancelled', 'rejected', 'deleted'].includes(normalized)) return 'danger';
  if (['urgent'].includes(normalized)) return 'danger';
  if (['pending', 'under_review', 'processing', 'serving', 'waiting'].includes(normalized)) return 'warning';
  if (['info', 'queued'].includes(normalized)) return 'info';
  return 'neutral';
}
