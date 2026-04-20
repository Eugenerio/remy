'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-line-2 bg-paper-2 px-3 text-sm text-ink',
        'placeholder:text-ink-3',
        'transition duration-fast ease-claude',
        'focus:border-ink-2 focus:outline-none focus:ring-2 focus:ring-coral/60',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'file:mr-3 file:rounded file:border-0 file:bg-paper-3 file:px-2 file:py-1',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[90px] w-full rounded-md border border-line-2 bg-paper-2 px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-3 resize-y',
        'focus:border-ink-2 focus:outline-none focus:ring-2 focus:ring-coral/60',
        className,
      )}
      {...props}
    />
  );
});

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}

export function Field({ label, hint, error, children, required }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-coral ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-rose">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-3">{hint}</span>
      ) : null}
    </label>
  );
}
