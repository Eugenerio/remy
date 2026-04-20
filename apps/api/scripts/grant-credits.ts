/**
 * One-off credit grant / set script.
 *
 * Usage:
 *   pnpm --filter @remy/api exec tsx scripts/grant-credits.ts --email you@x.com --amount 1000
 *   pnpm --filter @remy/api exec tsx scripts/grant-credits.ts --email you@x.com --set 1000
 *
 * --amount adds credits (can be negative).
 * --set makes the balance exactly that number (adds/subtracts the delta).
 */
import { PrismaClient } from '@prisma/client';
import { CreditsService } from '../src/services/credits.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce<Array<[string, string]>>((acc, tok, i, arr) => {
    if (tok.startsWith('--')) acc.push([tok.slice(2), arr[i + 1] ?? '']);
    return acc;
  }, []),
);

const email = args.email;
const amount = args.amount ? Number(args.amount) : undefined;
const target = args.set ? Number(args.set) : undefined;

if (!email || (amount === undefined && target === undefined)) {
  console.error('Usage: --email <e> (--amount <n> | --set <n>)');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: email!.toLowerCase() },
    include: { balance: true },
  });
  if (!user) throw new Error(`No user with email ${email}`);

  let delta: number;
  if (target !== undefined) {
    delta = target - (user.balance?.currentBalance ?? 0);
  } else {
    delta = amount!;
  }
  if (delta === 0) {
    console.info(`Nothing to do — ${email} already at ${target}.`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const svc = new CreditsService(tx);
    await svc.grant({
      userId: user.id,
      amount: delta,
      kind: 'adjustment',
      reason: `cli grant-credits (${delta > 0 ? '+' : ''}${delta})`,
    });
  });

  const after = await prisma.creditBalance.findUnique({ where: { userId: user.id } });
  console.info(
    `✓ ${email}: balance ${user.balance?.currentBalance ?? 0} → ${after?.currentBalance ?? 0} (Δ ${delta > 0 ? '+' : ''}${delta})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
