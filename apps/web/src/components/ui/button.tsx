'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/cn';
import { Spinner } from '../icons';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-paper hover:bg-ink-2 active:bg-ink-2 disabled:bg-ink-3 disabled:text-paper/70',
  secondary:
    'bg-paper-2 text-ink border border-line-2 hover:bg-paper-3 active:bg-paper-3 disabled:text-ink-3',
  ghost:
    'text-ink-2 hover:bg-paper-2 active:bg-paper-3 disabled:text-ink-3',
  danger:
    'bg-rose text-paper hover:brightness-95 active:brightness-90 disabled:opacity-60',
  subtle:
    'bg-coral/15 text-coral-ink hover:bg-coral/25 active:bg-coral/30 disabled:opacity-60',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-md gap-1',
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-md gap-2',
  lg: 'h-12 px-5 text-base rounded-lg gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    asChild = false,
    children,
    ...props
  },
  ref,
) {
  const classes = cn(
    'inline-flex items-center justify-center font-medium whitespace-nowrap',
    'transition-[background,color,transform] duration-fast ease-claude',
    'focus-visible:outline-coral',
    'disabled:pointer-events-none select-none',
    variants[variant],
    sizes[size],
    className,
  );

  // asChild: pass styling through to a single child (e.g. <Link>). Radix's
  // Slot requires exactly one child, so we can't inject a spinner here.
  if (asChild) {
    return (
      <Slot
        ref={ref as React.Ref<HTMLElement>}
        data-variant={variant}
        className={classes}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      data-variant={variant}
      className={classes}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <Spinner className="animate-spin" size={size === 'lg' ? 18 : size === 'xs' ? 12 : 14} />
      )}
      {children}
    </button>
  );
});
