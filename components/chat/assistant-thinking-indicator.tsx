import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AssistantThinkingIndicator({
  label,
  className,
  compact = false,
}: {
  label: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'mr-auto flex w-fit items-start gap-2 rounded-[var(--resident-radius-md)] border border-[color:rgba(18,56,40,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,251,248,0.98)_100%)] px-3 py-2.5',
        compact && 'rounded-[var(--resident-radius-sm)] px-2.5 py-2',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color:var(--resident-accent-soft)] text-[color:var(--resident-accent-strong)]">
        <Bot size={12} />
      </div>
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--resident-ink-600)]">{label}</p>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--resident-accent-strong)] [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--resident-accent-strong)] [animation-delay:140ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--resident-accent-strong)] [animation-delay:280ms]" />
        </div>
      </div>
    </div>
  );
}
