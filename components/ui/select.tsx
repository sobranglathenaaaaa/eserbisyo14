import * as React from 'react';

import { cn } from '@/lib/utils';

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'flex h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

export { Select };
