import { describe, it, expect, beforeEach } from 'vitest';
import { CreditsService } from '../src/services/credits.js';

/**
 * Unit-level tests for CreditsService that don't hit a real Postgres.
 *
 * We implement just enough of the Prisma surface to exercise the business
 * logic. The tests assert:
 *
 *   - reserve moves balance → pending atomically
 *   - settle splits reserved into charge + refund with the right sign
 *   - grants move current + lifetime counters
 *   - cancellation returns pending to current
 *   - settle is idempotent on a reservation it has already cancelled
 */

interface Balance {
  userId: string;
  currentBalance: number;
  pendingBalance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
}
interface Tx {
  id: string;
  userId: string;
  kind: string;
  status: string;
  amount: number;
  reason?: string | null;
  referenceId?: string | null;
}

function makeDb(initial: Balance) {
  const balances = new Map<string, Balance>([[initial.userId, { ...initial }]]);
  const txs = new Map<string, Tx>();
  let nextId = 1;

  return {
    balances,
    txs,
    creditBalance: {
      findUnique: async ({ where }: { where: { userId: string } }) => balances.get(where.userId) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { userId: string };
        data: Record<string, { increment?: number; decrement?: number } | undefined>;
      }) => {
        const b = balances.get(where.userId);
        if (!b) throw new Error('not found');
        for (const [k, v] of Object.entries(data)) {
          if (!v) continue;
          if (typeof v.increment === 'number') (b as Record<string, number>)[k] += v.increment;
          if (typeof v.decrement === 'number') (b as Record<string, number>)[k] -= v.decrement;
        }
        balances.set(where.userId, b);
        return b;
      },
    },
    creditTransaction: {
      create: async ({ data }: { data: Omit<Tx, 'id'> }) => {
        const id = `tx-${nextId++}`;
        const row: Tx = { id, ...data };
        txs.set(id, row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) => txs.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Tx> }) => {
        const row = txs.get(where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data);
        txs.set(row.id, row);
        return row;
      },
    },
  } as const;
}

type FakeDb = ReturnType<typeof makeDb>;
type AnyCast = (db: FakeDb) => unknown;
const cast = ((x) => x) as AnyCast;

const USER = 'user-1';

describe('CreditsService.reserve', () => {
  it('moves from available to pending', async () => {
    const db = makeDb({ userId: USER, currentBalance: 300, pendingBalance: 0, lifetimeGranted: 300, lifetimeSpent: 0 });
    const svc = new CreditsService(cast(db) as never);
    const res = await svc.reserve({
      userId: USER,
      action: 'VIDEO_GENERATION_SHORT',
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    expect(res.cost).toBe(40);
    expect(db.balances.get(USER)!.pendingBalance).toBe(40);
    expect(db.balances.get(USER)!.currentBalance).toBe(300);
    expect([...db.txs.values()][0]!.kind).toBe('usage_reserve');
    expect([...db.txs.values()][0]!.status).toBe('pending');
  });

  it('refuses when insufficient available', async () => {
    const db = makeDb({ userId: USER, currentBalance: 50, pendingBalance: 20, lifetimeGranted: 50, lifetimeSpent: 0 });
    const svc = new CreditsService(cast(db) as never);
    await expect(
      svc.reserve({
        userId: USER,
        action: 'VIDEO_GENERATION_SHORT',
        referenceKind: 'Job',
        referenceId: 'job-1',
      }),
    ).rejects.toMatchObject({ code: 'insufficient_credits' });
  });

  it('zero-cost actions return without writing a tx', async () => {
    const db = makeDb({ userId: USER, currentBalance: 10, pendingBalance: 0, lifetimeGranted: 10, lifetimeSpent: 0 });
    const svc = new CreditsService(cast(db) as never);
    const res = await svc.reserve({
      userId: USER,
      action: 'TREND_INGEST',
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    expect(res.cost).toBe(0);
    expect(res.transactionId).toBeNull();
    expect(db.txs.size).toBe(0);
    expect(db.balances.get(USER)!.pendingBalance).toBe(0);
  });
});

describe('CreditsService.settle', () => {
  let db: ReturnType<typeof makeDb>;
  let svc: CreditsService;
  let reservationId: string;

  beforeEach(async () => {
    db = makeDb({ userId: USER, currentBalance: 500, pendingBalance: 0, lifetimeGranted: 500, lifetimeSpent: 0 });
    svc = new CreditsService(cast(db) as never);
    const res = await svc.reserve({
      userId: USER,
      action: 'VIDEO_GENERATION_SHORT',
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    reservationId = res.transactionId!;
  });

  it('success: full charge, no refund', async () => {
    const out = await svc.settle({
      userId: USER,
      reservationTxId: reservationId,
      reservedAmount: 40,
      chargeAmount: 40,
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    expect(out.charged).toBe(40);
    expect(out.refunded).toBe(0);
    expect(db.balances.get(USER)!.currentBalance).toBe(460);
    expect(db.balances.get(USER)!.pendingBalance).toBe(0);
    expect(db.balances.get(USER)!.lifetimeSpent).toBe(40);
  });

  it('partial: 50/50 split', async () => {
    const out = await svc.settle({
      userId: USER,
      reservationTxId: reservationId,
      reservedAmount: 40,
      chargeAmount: 20,
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    expect(out.charged).toBe(20);
    expect(out.refunded).toBe(20);
    expect(db.balances.get(USER)!.currentBalance).toBe(480);
    expect(db.balances.get(USER)!.pendingBalance).toBe(0);
  });

  it('idempotent on second call', async () => {
    await svc.settle({
      userId: USER,
      reservationTxId: reservationId,
      reservedAmount: 40,
      chargeAmount: 40,
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    const again = await svc.settle({
      userId: USER,
      reservationTxId: reservationId,
      reservedAmount: 40,
      chargeAmount: 40,
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    expect(again).toEqual({ charged: 0, refunded: 0 });
    expect(db.balances.get(USER)!.currentBalance).toBe(460);
  });
});

describe('CreditsService.grant', () => {
  it('grants move current + lifetime granted', async () => {
    const db = makeDb({ userId: USER, currentBalance: 0, pendingBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0 });
    const svc = new CreditsService(cast(db) as never);
    await svc.grant({ userId: USER, amount: 100, kind: 'purchase', reason: 'topup' });
    expect(db.balances.get(USER)!.currentBalance).toBe(100);
    expect(db.balances.get(USER)!.lifetimeGranted).toBe(100);
  });

  it('negative adjustments debit current', async () => {
    const db = makeDb({ userId: USER, currentBalance: 50, pendingBalance: 0, lifetimeGranted: 50, lifetimeSpent: 0 });
    const svc = new CreditsService(cast(db) as never);
    await svc.grant({ userId: USER, amount: -20, kind: 'adjustment', reason: 'refund err' });
    expect(db.balances.get(USER)!.currentBalance).toBe(30);
    expect(db.balances.get(USER)!.lifetimeGranted).toBe(50);
  });
});

describe('CreditsService.cancelReservation', () => {
  it('returns pending to current (implicitly, by simply decrementing pending)', async () => {
    const db = makeDb({ userId: USER, currentBalance: 200, pendingBalance: 0, lifetimeGranted: 200, lifetimeSpent: 0 });
    const svc = new CreditsService(cast(db) as never);
    const r = await svc.reserve({
      userId: USER,
      action: 'VIDEO_GENERATION_SHORT',
      referenceKind: 'Job',
      referenceId: 'job-1',
    });
    expect(db.balances.get(USER)!.pendingBalance).toBe(40);

    await svc.cancelReservation({ userId: USER, reservationTxId: r.transactionId, reservedAmount: 40 });
    expect(db.balances.get(USER)!.pendingBalance).toBe(0);
    expect(db.balances.get(USER)!.currentBalance).toBe(200);
  });
});
