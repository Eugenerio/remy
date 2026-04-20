import { supabaseAdmin } from '../supabase.js';
import { env } from '../env.js';
import { logger } from '../logger.js';

/**
 * Ensure the three Supabase Storage buckets Remy uses exist. Idempotent —
 * safe to call on every server start. We create them private (no public
 * access); clients only interact via signed URLs we mint per-request.
 */
export async function ensureStorageBuckets(): Promise<void> {
  // We rely on the project-level default for per-file size (50MB on free
  // tier, higher on paid plans). Per-bucket overrides would fail here if
  // they exceed the project cap, so we leave them unset.
  const bucketNames = [
    env.SUPABASE_BUCKET_UPLOADS,
    env.SUPABASE_BUCKET_DATASETS,
    env.SUPABASE_BUCKET_GENERATIONS,
  ];

  const { data: existing, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    logger.warn({ err: listErr }, 'could not list buckets — storage may be mis-configured');
    return;
  }
  const haveName = new Set(existing.map((b) => b.name));

  for (const name of bucketNames) {
    if (haveName.has(name)) continue;
    const { error } = await supabaseAdmin.storage.createBucket(name, { public: false });
    if (error) {
      logger.warn({ bucket: name, err: error.message }, 'create bucket failed');
      continue;
    }
    logger.info({ bucket: name }, 'bucket created');
  }
}
