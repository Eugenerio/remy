import Link from 'next/link';
import { Logo } from '@/components/icons';
import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <Logo size={22} />
          <span className="font-display text-xl">Remy</span>
        </Link>
        <h1 className="font-display text-3xl tracking-tight">Create your studio</h1>
        <p className="mt-2 text-ink-2">30 credits free — enough to train one character and ship a short video.</p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-6 text-sm text-ink-2">
          Already on Remy?{' '}
          <Link href="/login" className="text-coral-ink font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
