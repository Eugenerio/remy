import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo, SparkSmall } from '@/components/icons';
import { createClient } from '@/lib/supabase/server';
import { OnboardingCompleteButton } from './complete-button';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-6">
          <Logo size={22} />
          <span className="font-display text-xl">Remy</span>
        </div>
        <h1 className="font-display text-4xl tracking-tight">Welcome{user.user_metadata?.name ? `, ${user.user_metadata.name}` : ''}.</h1>
        <p className="mt-3 text-ink-2">
          Three steps to your first video. You'll finish this inside of twenty minutes.
        </p>

        <div className="mt-8 space-y-3">
          {[
            { n: 1, title: 'Create a character', body: 'Upload a face + 10–20 reference photos. Training takes ~20 minutes.', href: '/characters/new' },
            { n: 2, title: 'Add a trend source', body: 'Pick a TikTok creator or a hashtag worth riding.', href: '/trends' },
            { n: 3, title: 'Ship your first video', body: 'One click, one flat credit cost.', href: '/generate' },
          ].map((s) => (
            <Card key={s.n}>
              <CardHeader className="flex-row items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-coral/15 text-coral-ink font-display text-sm">
                  {s.n}
                </span>
                <div className="flex-1">
                  <CardTitle>{s.title}</CardTitle>
                  <CardDescription>{s.body}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-ink-3">
            <SparkSmall size={14} className="text-coral" />
            <span>30 free credits have been added to your account.</span>
          </div>
          <OnboardingCompleteButton />
        </div>
      </div>
    </div>
  );
}
