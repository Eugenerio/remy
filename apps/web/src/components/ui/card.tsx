import * as React from 'react';
import { cn } from '@/lib/cn';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-paper-2 shadow-card',
        'transition-[box-shadow,border-color] duration-fast ease-claude',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn('px-5 pt-5 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-display text-lg leading-tight tracking-tight text-ink', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-ink-3 mt-1', className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-line flex items-center gap-2', className)}
      {...props}
    />
  );
}
