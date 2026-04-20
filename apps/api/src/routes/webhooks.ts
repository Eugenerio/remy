import { Hono } from 'hono';
import { z } from 'zod';
import type Stripe from 'stripe';
import { errors } from '@remy/shared/errors';
import { JOB_STATUSES, type JobStatus } from '@remy/shared/jobs';
import type { AppEnv } from '../context.js';
import { env } from '../env.js';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { verifySignature } from '../services/hmac.js';
import { stripe, stripeEnabled, planForPrice, topupForPrice, creditsForPlan, creditsForPack } from '../services/stripe.js';
import { settleJobCredits, CreditsService } from '../services/credits.js';

export const webhookRoutes = new Hono<AppEnv>();

// ----------------------------------------------------------------------------
// AI service — job progress + terminal updates
// ----------------------------------------------------------------------------

const aiJobUpdateSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(JOB_STATUSES),
  progress: z
    .object({
      percent: z.number().min(0).max(100),
      stage: z.string(),
      message: z.string().optional().nullable(),
      eta_seconds: z.number().optional().nullable(),
    })
    .optional(),
  output: z
    .object({
      video_key: z.string().optional(),
      thumbnail_key: z.string().optional(),
      lora_weights_key: z.string().optional(),
      reference_image_key: z.string().optional(),
      outfit_prompt: z.string().optional(),
      duration_seconds: z.number().optional(),
    })
    .optional()
    .nullable(),
  error: z.string().optional().nullable(),
  external_job_id: z.string().optional().nullable(),
});

webhookRoutes.post('/ai', async (c) => {
  const signature = c.req.header('x-remy-signature');
  const raw = await c.req.text();
  if (!verifySignature(raw, signature)) throw errors.unauthenticated('Bad signature');
  const body = aiJobUpdateSchema.parse(JSON.parse(raw));

  await prisma.webhookEvent.create({
    data: {
      source: 'ai',
      eventId: `${body.job_id}:${Date.now()}`,
      eventType: body.status,
      payload: body,
    },
  });

  const job = await prisma.job.findUnique({ where: { id: body.job_id } });
  if (!job) throw errors.notFound('Job');

  // Progress-only updates don't touch credits.
  const wasTerminal = ['completed', 'failed', 'cancelled', 'refunded'].includes(job.status);
  const nowTerminal = ['completed', 'failed', 'cancelled', 'refunded'].includes(body.status);

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: body.status,
      progress: body.progress ?? undefined,
      error: body.error ?? undefined,
      externalJobId: body.external_job_id ?? undefined,
      startedAt: body.status === 'running' && !job.startedAt ? new Date() : undefined,
      finishedAt: nowTerminal && !wasTerminal ? new Date() : undefined,
      output: body.output ? { ...((job.output as object) ?? {}), ...body.output } : undefined,
    },
  });

  if (body.output && job.kind === 'video_generation') {
    await prisma.generation.update({
      where: { jobId: job.id },
      data: {
        outputVideoKey: body.output.video_key ?? undefined,
        outputThumbnailKey: body.output.thumbnail_key ?? undefined,
        outfitPrompt: body.output.outfit_prompt ?? undefined,
      },
    });
  }

  if (body.output && job.kind === 'lora_training' && body.output.lora_weights_key) {
    const lora = await prisma.loraModel.create({
      data: {
        characterId: job.characterId!,
        weightsKey: body.output.lora_weights_key,
        status: 'ready',
        trainedOn: new Date(),
      },
    });
    await prisma.character.update({
      where: { id: job.characterId! },
      data: { activeLoraId: lora.id },
    });
  }

  if (nowTerminal && !wasTerminal) {
    await settleJobCredits(prisma, { jobId: job.id, finalStatus: body.status as JobStatus });
  }

  return c.json({ ok: true });
});

// ----------------------------------------------------------------------------
// Modal — terminal only (progress comes through AI service)
// ----------------------------------------------------------------------------

webhookRoutes.post('/modal', async (c) => {
  const signature = c.req.header('x-remy-signature');
  const raw = await c.req.text();
  if (!verifySignature(raw, signature, env.INTERNAL_SERVICE_TOKEN)) {
    throw errors.unauthenticated('Bad signature');
  }
  const body = aiJobUpdateSchema.parse(JSON.parse(raw));
  logger.info({ body }, 'modal webhook');
  // Reuse the same logic as AI webhook — Modal forwards through the AI
  // service in the normal path, but this is the backstop if the AI crashes.
  c.req.raw.headers.set('x-remy-signature', signature!);
  const res = await fetch(`http://127.0.0.1:${env.PORT}/v1/webhooks/ai`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-remy-signature': signature! },
    body: raw,
  });
  return c.json({ ok: res.ok });
});

// ----------------------------------------------------------------------------
// Stripe
// ----------------------------------------------------------------------------

webhookRoutes.post('/stripe', async (c) => {
  if (!stripeEnabled || !stripe) throw errors.upstreamUnavailable('Stripe is not configured');
  const signature = c.req.header('stripe-signature');
  const raw = await c.req.text();
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) throw errors.unauthenticated('Missing signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    logger.warn({ err: e }, 'stripe signature failed');
    throw errors.unauthenticated('Signature mismatch');
  }

  // Idempotency: unique (stripe, event.id)
  try {
    await prisma.webhookEvent.create({
      data: {
        source: 'stripe',
        eventId: event.id,
        eventType: event.type,
        payload: event as unknown as object,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return c.json({ ok: true, duplicate: true });
    throw e;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.remy_user_id;
      if (!userId) break;

      // Topup: one-time payment with pack metadata
      if (session.mode === 'payment' && session.metadata?.topup_pack) {
        const pack = session.metadata.topup_pack as 'pack_100' | 'pack_500' | 'pack_2000';
        const credits = creditsForPack(pack);
        await prisma.$transaction(async (tx) => {
          const svc = new CreditsService(tx);
          await svc.grant({
            userId,
            amount: credits,
            kind: 'purchase',
            reason: `Top-up ${pack}`,
            referenceKind: 'StripeSession',
            referenceId: undefined,
          });
        });
      }

      // Subscription: handled by subscription.created/updated events below
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const ourSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
      if (!ourSub) break;

      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? planForPrice(priceId) : null;

      await prisma.subscription.update({
        where: { id: ourSub.id },
        data: {
          stripeSubscriptionId: sub.id,
          plan: plan ?? ourSub.plan,
          status: sub.status as Stripe.Subscription.Status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;
      const ourSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
      if (!ourSub) break;

      const priceId = invoice.lines.data[0]?.price?.id;
      const plan = priceId ? planForPrice(priceId) : null;
      const isRenewal = invoice.billing_reason === 'subscription_cycle';
      const isFirstSub = invoice.billing_reason === 'subscription_create';

      // Mirror the invoice
      await prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          userId: ourSub.userId,
          stripeInvoiceId: invoice.id,
          status: 'paid',
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
          pdfUrl: invoice.invoice_pdf ?? null,
          paidAt: new Date(),
          creditsGranted: plan && plan !== 'free' ? creditsForPlan(plan) : 0,
        },
        update: { status: 'paid', amountPaid: invoice.amount_paid, paidAt: new Date() },
      });

      if ((isRenewal || isFirstSub) && plan && plan !== 'free') {
        await prisma.$transaction(async (tx) => {
          const svc = new CreditsService(tx);
          await svc.grant({
            userId: ourSub.userId,
            amount: creditsForPlan(plan),
            kind: 'subscription_grant',
            reason: `Subscription grant (${plan})`,
            referenceKind: 'Invoice',
            referenceId: undefined,
          });
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const ourSub = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
      if (ourSub) {
        await prisma.subscription.update({
          where: { id: ourSub.id },
          data: { plan: 'free', status: 'canceled' },
        });
      }
      break;
    }
  }

  await prisma.webhookEvent.update({
    where: { source_eventId: { source: 'stripe', eventId: event.id } },
    data: { processedAt: new Date() },
  });

  return c.json({ ok: true });
});
