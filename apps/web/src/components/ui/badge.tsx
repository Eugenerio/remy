import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'coral' | 'leaf' | 'amber' | 'rose' | 'slate';

const tones: Record<Tone, string> = {
  neutral: 'bg-paper-3 text-ink',
  coral: 'bg-coral/15 text-coral-ink',
  leaf: 'bg-leaf/15 text-leaf',
  amber: 'bg-amber/15 text-amber',
  rose: 'bg-rose/15 text-rose',
  slate: 'bg-slate/20 text-ink-2',
};

export function Badge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-6 px-2 rounded-sm text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
