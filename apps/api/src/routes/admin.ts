import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminCreditAdjustSchema } from '@remy/shared/schemas';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { CreditsService } from '../services/credits.js';
import { requireAdmin } from '../middleware/auth.js';

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use('*', requireAdmin);

adminRoutes.get('/users', async (c) => {
  const url = new URL(c.req.url);
  const q = url.searchParams.get('q') ?? '';
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { balance: true, subscription: true },
  });
  return c.json({
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.subscription?.plan ?? 'free',
      status: u.subscription?.status ?? 'active',
      balance: u.balance?.currentBalance ?? 0,
      pending: u.balance?.pendingBalance ?? 0,
      created_at: u.createdAt,
    })),
  });
});

adminRoutes.post('/credits/adjust', zValidator('json', adminCreditAdjustSchema), async (c) => {
  const admin = c.get('user');
  if (!admin) throw errors.unauthenticated();
  const body = c.req.valid('json');
  const target = await prisma.user.findUnique({ where: { id: body.user_id } });
  if (!target) throw errors.notFound('User');

  await prisma.$transaction(async (tx) => {
    const credits = new CreditsService(tx);
    await credits.grant({
      userId: target.id,
      amount: body.delta,
      kind: 'adjustment',
      reason: `admin:${admin.id} — ${body.reason}`,
    });
  });
  return c.json({ ok: true });
});

adminRoutes.get('/jobs/failed', async (c) => {
  const items = await prisma.job.findMany({
    where: { status: 'failed' },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { user: { select: { email: true } } },
  });
  return c.json({ items });
});
