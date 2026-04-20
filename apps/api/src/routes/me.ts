import { Hono } from 'hono';
import { errors } from '@remy/shared/errors';
import { PLANS } from '@remy/shared/credits';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { CreditsService } from '../services/credits.js';

export const meRoutes = new Hono<AppEnv>();

meRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();

  const [profile, balance, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    new CreditsService().getBalance(user.id),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
  ]);
  if (!profile) throw errors.notFound('User');

  return c.json({
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatarUrl,
      role: profile.role,
      onboarded_at: profile.onboardedAt,
    },
    balance,
    subscription: {
      plan: subscription?.plan ?? 'free',
      status: subscription?.status ?? 'active',
      current_period_end: subscription?.currentPeriodEnd ?? null,
      cancel_at_period_end: subscription?.cancelAtPeriodEnd ?? false,
      plan_details: PLANS[(subscription?.plan ?? 'free') as keyof typeof PLANS],
    },
  });
});

meRoutes.post('/onboard', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardedAt: new Date() },
  });
  return c.json({ ok: true });
});
