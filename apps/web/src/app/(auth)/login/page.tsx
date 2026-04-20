import Link from 'next/link';
import { Logo } from '@/components/icons';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col justify-between w-1/2 bg-ink text-paper p-12">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-display text-xl">Remy</span>
        </Link>
        <blockquote>
          <p className="font-display text-3xl leading-snug tracking-tight">
            &ldquo;I trained a character on 14 photos on Monday.&nbsp;Shipped a viral dance
            edit by Tuesday lunch.&rdquo;
          </p>
          <footer className="mt-5 text-paper/70 text-sm">
            — Selene Q., creator on Studio plan
          </footer>
        </blockquote>
        <div className="text-xs text-paper/50">
          Built with Next.js, Hono, FastAPI, ComfyUI, and Modal.
        </div>
      </aside>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 lg:hidden mb-8">
              <Logo size={22} />
              <span className="font-display text-xl">Remy</span>
            </Link>
            <h1 className="font-display text-3xl tracking-tight">Welcome back</h1>
            <p className="mt-2 text-ink-2">Sign in to continue to your studio.</p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-ink-2">
            New here?{' '}
            <Link href="/signup" className="text-coral-ink font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
