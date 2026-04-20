import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow && (
          <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-3">{eyebrow}</div>
        )}
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink leading-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-base text-ink-2">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
