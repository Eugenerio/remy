import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('[seed] creating demo user');
  const supabaseUserId = '00000000-0000-0000-0000-000000000001';
  const user = await prisma.user.upsert({
    where: { supabaseUserId },
    create: {
      supabaseUserId,
      email: 'demo@remy.local',
      name: 'Demo Creator',
      role: 'user',
      balance: {
        create: { currentBalance: 1500, lifetimeGranted: 1500 },
      },
      subscription: {
        create: { plan: 'starter', status: 'active' },
      },
      transactions: {
        create: [
          {
            kind: 'bonus',
            status: 'applied',
            amount: 500,
            reason: 'Demo seed',
          },
          {
            kind: 'subscription_grant',
            status: 'applied',
            amount: 1000,
            reason: 'Demo seed plan grant',
          },
        ],
      },
    },
    update: {},
  });

  console.info('[seed] creating default trend sources');
  const sources = [
    { kind: 'category' as const, handle: 'dance', label: 'Dance' },
    { kind: 'category' as const, handle: 'transitions', label: 'Transitions' },
    { kind: 'category' as const, handle: 'cosplay', label: 'Cosplay' },
    { kind: 'tiktok_hashtag' as const, handle: 'pov', label: '#pov' },
  ];
  for (const src of sources) {
    await prisma.trendSource.upsert({
      where: { userId_kind_handle: { userId: user.id, kind: src.kind, handle: src.handle } },
      create: { ...src, userId: user.id },
      update: {},
    });
  }

  console.info('[seed] done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
