'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="font-display text-5xl tracking-tight">Something broke.</div>
      <p className="text-ink-2 max-w-md">{error.message}</p>
      {error.digest && <p className="text-xs text-ink-3">Trace: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
