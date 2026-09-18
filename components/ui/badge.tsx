import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-[color:var(--status-neutral-bg)] text-[color:var(--status-neutral-text)]',
        success: 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success-text)]',
        warning: 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning-text)]',
        danger: 'bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger-text)]',
        info: 'bg-[color:var(--status-info-bg)] text-[color:var(--status-info-text)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
