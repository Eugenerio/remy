'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/cn';

export function Progress({
  value,
  className,
  tone = 'coral',
}: {
  value: number;
  className?: string;
  tone?: 'coral' | 'leaf' | 'amber';
}) {
  const toneColor =
    tone === 'leaf' ? 'bg-leaf' : tone === 'amber' ? 'bg-amber' : 'bg-coral';
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-paper-3', className)}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full transition-transform duration-slow ease-claude', toneColor)}
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
