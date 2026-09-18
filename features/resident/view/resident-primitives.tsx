import Link from 'next/link';
import { cn } from '@/lib/utils';

export function ResidentSection({
  title,
  description,
  actions,
  children,
  className,
  variant = 'default',
  tone = 'default',
  density = 'regular',
  motion = true,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'plain';
  tone?: 'default' | 'raised' | 'muted' | 'accent';
  density?: 'regular' | 'compact';
  motion?: boolean;
}) {
  return (
    <section
      className={cn(
        motion ? 'resident-motion' : '',
        variant === 'plain'
          ? 'rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-3)]'
          : 'rounded-[var(--resident-radius-lg)] border border-[color:var(--resident-border-soft)] bg-[var(--resident-panel-gradient)] shadow-[var(--resident-shadow-1)]',
        tone === 'raised' ? 'shadow-[var(--resident-shadow-3)]' : '',
        tone === 'muted' ? 'bg-[color:var(--resident-surface-tint)]' : '',
        tone === 'accent'
          ? 'border-[color:rgba(29,95,71,0.18)] bg-[linear-gradient(140deg,rgba(255,255,255,0.98)_0%,rgba(236,245,240,0.98)_100%)]'
          : '',
        density === 'compact' ? 'p-4 md:p-5' : 'p-5 md:p-6',
        className
      )}
    >
      <header className={cn('flex flex-wrap items-start justify-between gap-3', density === 'compact' ? 'mb-3' : 'mb-5')}>
        <div className="min-w-0">
          <h2 className="font-heading text-[clamp(1.15rem,1.5vw,1.5rem)] font-semibold leading-tight text-[color:var(--resident-ink-900)]">
            {title}
          </h2>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--resident-ink-700)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 self-center">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function ResidentMetricCard({
  label,
  value,
  detail,
  className,
  compact = false,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  detail?: string;
  className?: string;
  compact?: boolean;
  tone?: 'default' | 'accent' | 'muted';
}) {
  return (
    <article
      className={cn(
        compact
          ? 'resident-interactive-lift rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] px-4 py-4 shadow-sm'
          : 'resident-interactive-lift rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[linear-gradient(165deg,#ffffff_0%,#eff6f1_100%)] p-5 shadow-[var(--resident-shadow-1)]',
        tone === 'accent' ? 'border-[color:rgba(29,95,71,0.18)] bg-[linear-gradient(155deg,#f8fcfa_0%,#e8f3ed_100%)]' : '',
        tone === 'muted' ? 'bg-[color:var(--resident-surface-tint)]' : '',
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--resident-ink-500)]">{label}</p>
      <p className={cn('font-heading font-semibold text-[color:var(--resident-ink-900)]', compact ? 'mt-2 text-2xl' : 'mt-2 text-3xl')}>
        {value}
      </p>
      {detail ? (
        <p className={cn('text-[color:var(--resident-ink-700)]', compact ? 'mt-1 text-xs leading-5' : 'mt-1 text-sm leading-6')}>{detail}</p>
      ) : null}
    </article>
  );
}

export function ResidentEmpty({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--resident-radius-md)] border border-dashed border-[color:var(--resident-border-strong)] bg-[linear-gradient(180deg,#f9fcfa_0%,#f2f7f4_100%)] p-6 text-center">
      <p className="font-heading text-base font-semibold text-[color:var(--resident-ink-900)]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--resident-ink-700)]">{description}</p>
      {actions ? <div className="mt-3 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function ResidentScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--resident-radius-sm)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)]">
      {children}
    </div>
  );
}

export function ResidentTableShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-[var(--resident-radius-md)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] p-3">
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? <p className="text-sm font-semibold text-[color:var(--resident-ink-900)]">{title}</p> : null}
            {description ? <p className="text-xs text-[color:var(--resident-ink-500)]">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <ResidentScrollTable>{children}</ResidentScrollTable>
    </div>
  );
}

export function ResidentActionBar({
  items,
  className,
}: {
  items: Array<{ label: string; description?: string; href: string; variant?: 'primary' | 'ghost' }>;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item, index) => (
        <Link
          key={`${item.href}-${index}`}
          href={item.href}
          className={cn(
            'resident-interactive-lift group grid gap-2 rounded-[var(--resident-radius-md)] border px-4 py-4 text-left resident-focusable',
            'border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] shadow-sm hover:border-[color:rgba(29,95,71,0.18)]',
            item.variant === 'primary'
              ? 'border-[color:rgba(23,90,64,0.58)] bg-[linear-gradient(145deg,#184d37_0%,#23684a_48%,#2f8f68_100%)] text-[color:var(--resident-shell-text)]'
              : 'text-[color:var(--resident-ink-900)]'
          )}
        >
          <p className="text-sm font-semibold">{item.label}</p>
          {item.description ? <p className="mt-1 text-xs text-[color:inherit]/80">{item.description}</p> : null}
        </Link>
      ))}
    </div>
  );
}
