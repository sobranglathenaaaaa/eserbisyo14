import * as React from 'react';

import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-1)] p-4 shadow-sm', className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col space-y-1.5', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('font-heading text-base font-semibold leading-none tracking-tight', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('pt-3', className)} {...props} />;
}

export { Card, CardContent, CardHeader, CardTitle };
