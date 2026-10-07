import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 px-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#165f40]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[#d6efe3]',
        ghost: 'border border-[color:var(--border)] bg-transparent text-[color:var(--brand-700)] hover:bg-[#e9f5ef]',
        headerGhost: 'border border-[color:rgba(237,248,243,0.35)] bg-[rgba(255,255,255,0.08)] text-white hover:bg-[rgba(255,255,255,0.2)] hover:text-white',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-[#a73f3f]',
        resident: 'border border-[color:#0f5c39] bg-[linear-gradient(180deg,#1b7a50_0%,#156241_100%)] text-white shadow-[0_8px_20px_rgba(21,98,65,0.25)] hover:bg-[linear-gradient(180deg,#166846_0%,#115237_100%)]',
        residentOutline: 'border-2 border-[color:#1b6b46] bg-white text-[color:#144b32] shadow-[0_2px_10px_rgba(20,75,50,0.08)] hover:bg-[#f3faf6]',
        residentOutlineOrange: 'border-2 border-[color:#b8742a] bg-white text-[color:#7a4418] shadow-[0_2px_10px_rgba(122,68,24,0.08)] hover:bg-[#fff7ed]',
        residentOutlineGray: 'border-2 border-[color:#d1d5db] bg-white text-[color:#374151] shadow-[0_2px_10px_rgba(55,65,81,0.04)] hover:bg-[#f8fafc]',
        destructiveOutline: 'border-2 border-[color:#b13b3b] bg-white text-[color:#912e2e] shadow-[0_2px_10px_rgba(145,46,46,0.08)] hover:bg-[#fff5f5]',
      },
      size: {
        default: 'h-11 min-h-11 px-4',
        sm: 'h-9 min-h-9 px-3 text-xs',
        lg: 'h-12 min-h-12 px-6 text-base',
        icon: 'h-10 w-10 min-h-0 min-w-0 p-0 rounded-full shrink-0',
        iconSm: 'h-8 w-8 min-h-0 min-w-0 p-0 rounded-full shrink-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      const child = React.Children.only(children) as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        ...props,
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button className={classes} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
