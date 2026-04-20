import type { PrismaClient, Prisma } from '@prisma/client';
import { CREDIT_COSTS, type CreditAction } from '@remy/shared/credits';
import { REFUND_RULES, PARTIAL_REFUND_FRACTION, type JobStatus } from '@remy/shared/jobs';
import { errors } from '@remy/shared/errors';
import { prisma as defaultPrisma } from '../db.js';

type Tx = Prisma.TransactionClient;
type Db = PrismaClient | Tx;

export interface ReserveResult {
  jobId: string;
  transactionId: string;
  balanceAfter: number;
  pendingAfter: number;
}

export class CreditsService {
  constructor(private readonly db: Db = defaultPrisma) {}

  /** Non-locking read used by dashboards + UI preflight. */
  async getBalance(userId: string) {
    const balance = await this.db.creditBalance.findUnique({ where: { userId } });
    if (!balance) throw errors.notFound('Credit balance missing');
    return {
      current: balance.currentBalance,
      pending: balance.pendingBalance,
      available: balance.currentBalance - balance.pendingBalance,
      lifetimeGranted: balance.lifetimeGranted,
      lifetimeSpent: balance.lifetimeSpent,
    };
  }

  /**
   * Reserve credits for a new job. MUST be wrapped in a SERIALIZABLE
   * transaction by the caller (see `withReservation`). This method assumes
   * it is running inside a Prisma $transaction.
   *
   * Side effects on commit:
   *   - pending_balance += cost
   *   - inserts pending usage_reserve transaction
   */
  async reserve(params: {
    userId: string;
    action: CreditAction;
    costOverride?: number;
    referenceKind: string;
    referenceId: string;
  }) {
    const cost = params.costOverride ?? CREDIT_COSTS[params.action];
    if (cost <= 0) {
      // No reservation needed for zero-cost actions.
      return { transactionId: null as string | null, cost: 0 };
    }

    const balance = await this.db.creditBalance.findUnique({
      where: { userId: params.userId },
    });
    if (!balance) throw errors.notFound('Credit balance missing');

    const available = balance.currentBalance - balance.pendingBalance;
    if (available < cost) throw errors.insufficientCredits(cost, available);

    const tx = await this.db.creditTransaction.create({
      data: {
        userId: params.userId,
        kind: 'usage_reserve',
        status: 'pending',
        amount: -cost,
        reason: params.action,
        referenceKind: params.referenceKind,
        referenceId: params.referenceId,
      },
    });

    await this.db.creditBalance.update({
      where: { userId: params.userId },
      data: { pendingBalance: { increment: cost } },
    });

    return { transactionId: tx.id, cost };
  }

  /**
   * Finalise a reservation: charge `chargeAmount`, refund (reserved - charge).
   * Called when a job completes successfully or fails partway through.
   */
  async settle(params: {
    userId: string;
    reservationTxId: string | null;
    reservedAmount: number;
    chargeAmount: number;
    referenceKind: string;
    referenceId: string;
    reason?: string;
  }) {
    if (!params.reservationTxId || params.reservedAmount === 0) {
      return { charged: 0, refunded: 0 };
    }

    const res = await this.db.creditTransaction.findUnique({
      where: { id: params.reservationTxId },
    });
    if (!res) throw errors.notFound('Reservation missing');
    if (res.status !== 'pending') {
      // Idempotency: already settled, nothing to do.
      return { charged: 0, refunded: 0 };
    }

    const refund = Math.max(0, params.reservedAmount - params.chargeAmount);

    // Cancel the pending reservation
    await this.db.creditTransaction.update({
      where: { id: params.reservationTxId },
      data: { status: 'cancelled' },
    });

    // Apply the charge (negative amount)
    if (params.chargeAmount > 0) {
      await this.db.creditTransaction.create({
        data: {
          userId: params.userId,
          kind: 'usage_charge',
          status: 'applied',
          amount: -params.chargeAmount,
          reason: params.reason ?? 'Usage',
          referenceKind: params.referenceKind,
          referenceId: params.referenceId,
        },
      });
    }

    // Apply the refund (positive, if any)
    if (refund > 0) {
      await this.db.creditTransaction.create({
        data: {
          userId: params.userId,
          kind: 'usage_refund',
          status: 'applied',
          amount: refund,
          reason: 'Partial refund',
          referenceKind: params.referenceKind,
          referenceId: params.referenceId,
        },
      });
    }

    await this.db.creditBalance.update({
      where: { userId: params.userId },
      data: {
        pendingBalance: { decrement: params.reservedAmount },
        currentBalance: { decrement: params.chargeAmount },
        lifetimeSpent: { increment: params.chargeAmount },
      },
    });

    return { charged: params.chargeAmount, refunded: refund };
  }

  /** Grant credits (purchase, subscription cycle, admin adjustment, bonus). */
  async grant(params: {
    userId: string;
    amount: number;
    kind: 'purchase' | 'subscription_grant' | 'adjustment' | 'bonus';
    reason: string;
    referenceKind?: string;
    referenceId?: string;
  }) {
    if (params.amount === 0) return;
    const sign = params.kind === 'adjustment' ? Math.sign(params.amount) : 1;
    const positiveAmount = Math.abs(params.amount);

    await this.db.creditTransaction.create({
      data: {
        userId: params.userId,
        kind: params.kind,
        status: 'applied',
        amount: sign * positiveAmount,
        reason: params.reason,
        referenceKind: params.referenceKind ?? null,
        referenceId: params.referenceId ?? null,
      },
    });

    await this.db.creditBalance.update({
      where: { userId: params.userId },
      data:
        sign > 0
          ? { currentBalance: { increment: positiveAmount }, lifetimeGranted: { increment: positiveAmount } }
          : { currentBalance: { decrement: positiveAmount } },
    });
  }

  /**
   * Cancel a reservation (full refund). Used when a queued job is cancelled
   * before it starts.
   */
  async cancelReservation(params: {
    userId: string;
    reservationTxId: string | null;
    reservedAmount: number;
  }) {
    if (!params.reservationTxId || params.reservedAmount === 0) return;
    const res = await this.db.creditTransaction.findUnique({
      where: { id: params.reservationTxId },
    });
    if (!res || res.status !== 'pending') return;

    await this.db.creditTransaction.update({
      where: { id: params.reservationTxId },
      data: { status: 'cancelled' },
    });
    await this.db.creditBalance.update({
      where: { userId: params.userId },
      data: { pendingBalance: { decrement: params.reservedAmount } },
    });
  }
}

/**
 * Settle a job using shared refund rules. Safe to call multiple times — the
 * underlying credits service is idempotent on already-settled reservations.
 */
export async function settleJobCredits(
  db: PrismaClient,
  args: {
    jobId: string;
    finalStatus: JobStatus;
  },
) {
  await db.$transaction(async (tx) => {
    const job = await tx.job.findUnique({ where: { id: args.jobId } });
    if (!job) throw errors.notFound('Job missing');
    if (job.reservedCredits === 0) return;

    const rule = REFUND_RULES[args.finalStatus];
    let charge = 0;
    if (rule === 'none') charge = job.reservedCredits;
    if (rule === 'partial') charge = Math.round(job.reservedCredits * (1 - PARTIAL_REFUND_FRACTION));
    if (rule === 'full') charge = 0;

    const credits = new CreditsService(tx);
    const { charged, refunded } = await credits.settle({
      userId: job.userId,
      reservationTxId: job.reservationTxId,
      reservedAmount: job.reservedCredits,
      chargeAmount: charge,
      referenceKind: 'Job',
      referenceId: job.id,
      reason: `job ${job.kind} ${args.finalStatus}`,
    });

    await tx.job.update({
      where: { id: job.id },
      data: {
        chargedCredits: charged,
        refundedCredits: refunded,
      },
    });
  });
}
