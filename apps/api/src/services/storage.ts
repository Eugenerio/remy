import { env } from '../env.js';
import { supabaseAdmin } from '../supabase.js';

type BucketKey = 'uploads' | 'generations' | 'datasets';

export function bucketName(bucket: BucketKey): string {
  switch (bucket) {
    case 'uploads':
      return env.SUPABASE_BUCKET_UPLOADS;
    case 'generations':
      return env.SUPABASE_BUCKET_GENERATIONS;
    case 'datasets':
      return env.SUPABASE_BUCKET_DATASETS;
  }
}

export interface TransformOpts {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number;
}

/**
 * Create a short-lived signed URL the client can PUT to directly. The user
 * does not get credentials for the bucket — only a signed URL good for
 * one upload, five minutes.
 */
export async function signedUpload(args: {
  bucket: BucketKey;
  userId: string;
  filename: string;
  contentType: string;
}) {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${args.userId}/${Date.now()}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucketName(args.bucket))
    .createSignedUploadUrl(key);
  if (error) throw error;

  return {
    key,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: `${env.SUPABASE_URL}/storage/v1/object/public/${bucketName(args.bucket)}/${key}`,
  };
}

/**
 * Cache of signed download URLs keyed by (bucket, key, transform hash). We
 * serve the cached URL until it's within 60s of expiry — that way repeat
 * polls of the same character page return the same URL strings and the
 * browser hits its image cache. Without this the URL changed every ~2s
 * and every image was re-downloaded on every poll.
 */
interface CacheEntry {
  url: string;
  expires: number;
}
const urlCache = new Map<string, CacheEntry>();
const CACHE_EARLY_EXPIRY_MS = 60_000; // refresh 60s before actual expiry

function cacheKey(bucket: BucketKey, key: string, transform?: TransformOpts): string {
  const t = transform
    ? `:${transform.width ?? ''}x${transform.height ?? ''}:${transform.resize ?? ''}:${transform.quality ?? ''}`
    : '';
  return `${bucket}:${key}${t}`;
}

/**
 * Signed GET URL for private buckets. Cached in-process for the URL's
 * lifetime so concurrent requests + polling don't hit Supabase repeatedly.
 *
 * Pass `transform` to get a downscaled/optimized variant — great for
 * gallery thumbnails (avoid shipping 5MB originals to a 200px grid).
 */
export async function signedDownload(args: {
  bucket: BucketKey;
  key: string;
  ttlSeconds?: number;
  transform?: TransformOpts;
}): Promise<string> {
  const ttl = args.ttlSeconds ?? 3600;
  const ck = cacheKey(args.bucket, args.key, args.transform);
  const hit = urlCache.get(ck);
  if (hit && hit.expires - CACHE_EARLY_EXPIRY_MS > Date.now()) return hit.url;

  const opts = args.transform ? { transform: args.transform } : undefined;
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName(args.bucket))
    // @ts-expect-error — supabase-js accepts the transform option at runtime
    // even though the typing in older minor versions omits it.
    .createSignedUrl(args.key, ttl, opts);
  if (error) throw error;

  urlCache.set(ck, { url: data.signedUrl, expires: Date.now() + ttl * 1000 });
  // Naive size cap; FIFO eviction so the cache doesn't grow unbounded.
  if (urlCache.size > 5_000) {
    const first = urlCache.keys().next().value;
    if (first) urlCache.delete(first);
  }
  return data.signedUrl;
}
