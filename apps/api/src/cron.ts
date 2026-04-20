/**
 * Cron entrypoint. Run as a Railway cron service with schedule `0 */6 * * *`
 * (every 6 hours). Each tick enqueues a `trend_ingest` job for every active
 * trend source whose `last_ingest_at` is older than 24h.
 */

import { prisma } from './db.js';
import { enqueueJob } from './services/queue.js';
import { logger } from './logger.js';

async function main() {
  const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sources = await prisma.trendSource.findMany({
    where: { active: true, OR: [{ lastIngestAt: null }, { lastIngestAt: { lt: oneDay } }] },
    take: 500,
  });

  logger.info({ count: sources.length }, 'cron: enqueueing trend ingests');

  for (const src of sources) {
    const job = await prisma.job.create({
      data: {
        userId: src.userId,
        kind: 'trend_ingest',
        status: 'queued',
        input: { source_id: src.id, kind: src.kind, handle: src.handle },
      },
    });
    await enqueueJob('trends', {
      job_id: job.id,
      kind: 'trend_ingest',
      user_id: src.userId,
      input: { source_id: src.id, kind: src.kind, handle: src.handle },
    });
    await prisma.trendSource.update({
      where: { id: src.id },
      data: { lastIngestAt: new Date() },
    });
  }

  logger.info('cron: done');
}

main()
  .catch((e) => {
    logger.error(e, 'cron failed');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
