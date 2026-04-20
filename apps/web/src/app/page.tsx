import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Characters as CharactersIcon,
  Film,
  Logo,
  SparkSmall,
  Trend,
} from '@/components/icons';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-display text-xl tracking-tight">Remy</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="hidden sm:inline-flex h-9 items-center px-3 text-sm text-ink-2 hover:text-ink rounded-md hover:bg-paper-2"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">
                Start free <ArrowRight size={14} />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-paper-2 border border-line px-3 py-1 text-xs font-medium text-ink-2">
              <SparkSmall size={14} className="text-coral" />
              Now in preview
            </p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[1.03] tracking-[-0.02em] text-ink">
              Spin up an AI influencer <span className="italic text-coral-ink">before lunch.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-2 max-w-xl">
              Upload a few photos, pick a TikTok you'd like to remake, and Remy does the rest.
              Trained character, crisp outfit, motion-perfect video — one click, one flat credit cost.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start with 30 free credits <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#how">See how it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-ink-3">
              No credit card. No Discord invite. Plain product.
            </p>
          </div>

          <div
            aria-hidden
            className="absolute -right-32 top-12 h-[420px] w-[420px] rounded-full blur-3xl opacity-60"
            style={{
              background:
                'radial-gradient(circle, color-mix(in oklab, var(--color-coral) 35%, transparent) 0%, transparent 65%)',
            }}
          />
        </div>
      </section>

      <section id="how" className="border-b border-line py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-3">How it works</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight">
              Four steps, all on autopilot.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: CharactersIcon,
                title: 'Build your character',
                body: 'Upload a face and 10–20 reference shots. Remy preprocesses and trains a LoRA for you.',
              },
              {
                Icon: Trend,
                title: 'Track real trends',
                body: 'Point Remy at TikTok creators or formats you want to ride. We surface the ones worth remaking.',
              },
              {
                Icon: Film,
                title: 'Generate in one click',
                body: 'Pick a trend, confirm the credit cost, ship a motion-perfect video with your character in it.',
              },
              {
                Icon: SparkSmall,
                title: 'Review and publish',
                body: 'Before/after diff on every take. Approve, regenerate, or discard — credits refund fairly when jobs fail.',
              },
            ].map(({ Icon, title, body }, i) => (
              <div key={i} className="rounded-lg border border-line bg-paper-2 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-paper-3 text-ink-2">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 font-display text-lg tracking-tight">{title}</h3>
                <p className="mt-1 text-sm text-ink-2">{body}</p>
                <div className="mt-4 text-xs text-ink-3">Step {i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-3">Pricing</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight">
              Pay for output, not activity.
            </h2>
            <p className="mt-3 text-ink-2">
              Credits are the only unit. Every action tells you what it'll cost before you commit.
              Failed jobs refund automatically.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                name: 'Creator',
                price: '$19',
                credits: '300',
                bullets: ['≈ 7 videos / month', 'Rollover up to 600', 'All models, all resolutions'],
                cta: 'Start creating',
              },
              {
                name: 'Studio',
                price: '$79',
                credits: '1,500',
                bullets: ['≈ 37 videos / month', 'Rollover up to 3,000', 'Priority queue'],
                cta: 'Go pro',
                featured: true,
              },
              {
                name: 'Scale',
                price: '$299',
                credits: '6,000',
                bullets: ['≈ 150 videos / month', 'Rollover up to 12,000', 'Team seats (soon)'],
                cta: 'Scale up',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={[
                  'rounded-lg border p-6',
                  plan.featured
                    ? 'bg-ink text-paper border-ink shadow-pop'
                    : 'bg-paper-2 border-line',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display text-xl">{plan.name}</div>
                  {plan.featured && (
                    <span className="rounded-full bg-coral/30 text-paper px-2 py-0.5 text-xs">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl tracking-tight">{plan.price}</span>
                  <span className={plan.featured ? 'text-paper/70' : 'text-ink-3'}>/mo</span>
                </div>
                <div className={plan.featured ? 'text-paper/80' : 'text-ink-2'}>
                  {plan.credits} credits / month
                </div>
                <ul className="mt-5 space-y-2 text-sm">
                  {plan.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className={plan.featured ? 'text-coral' : 'text-leaf'}>✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Button
                    asChild
                    variant={plan.featured ? 'subtle' : 'primary'}
                    className={plan.featured ? 'w-full' : 'w-full'}
                  >
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-ink-3">
          <div className="flex items-center gap-2">
            <Logo size={18} />
            <span>© {new Date().getFullYear()} Remy</span>
          </div>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
