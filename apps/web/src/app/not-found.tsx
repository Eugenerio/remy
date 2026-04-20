import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="font-display text-6xl tracking-tight">404</div>
      <div className="text-ink-2 max-w-md">
        Either this page wandered off or the URL is a little off.
      </div>
      <Button asChild>
        <Link href="/dashboard">Back to studio</Link>
      </Button>
    </div>
  );
}
