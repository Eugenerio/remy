import { z } from 'zod';
import { JOB_KINDS, JOB_STATUSES } from './jobs';

/* ------------------------------------------------------------------ *
 * Shared zod schemas. Used on both the API (validation) and the web  *
 * (React Hook Form resolvers). Keep in sync with Prisma schema.      *
 * ------------------------------------------------------------------ */

export const emailSchema = z.string().trim().toLowerCase().email();

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'Too long')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(80),
  acceptTerms: z.literal(true),
});

export const magicLinkSchema = z.object({
  email: emailSchema,
  redirectTo: z.string().url().optional(),
});

export const characterCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional(),
  faceImageKey: z.string().min(1),
  referenceImageKeys: z.array(z.string()).min(10).max(20),
});

export const characterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(500).optional(),
  archived: z.boolean().optional(),
});

export const addReferenceImagesSchema = z.object({
  referenceImageKeys: z.array(z.string().min(1)).min(1).max(30),
});

export const removeReferenceImageSchema = z.object({
  referenceImageKey: z.string().min(1),
});

export const trendSourceCreateSchema = z.object({
  kind: z.enum(['tiktok_creator', 'tiktok_hashtag', 'category']),
  handle: z.string().trim().min(1).max(100),
  label: z.string().trim().max(80).optional(),
});

export const suggestedVideoRankSchema = z.object({
  min_engagement: z.number().int().nonnegative().default(0),
  simple_only: z.boolean().default(true),
  limit: z.number().int().min(1).max(100).default(30),
});

export const generateVideoSchema = z.object({
  character_id: z.string().uuid(),
  suggested_video_id: z.string().uuid().optional(),
  reference_video_url: z.string().url().optional(),
  duration_seconds: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(5),
  resolution: z.enum(['720p', '1080p']).default('720p'),
  seed: z.number().int().optional(),
  outfit_override: z.string().max(2000).optional(),
  confirm_credit_cost: z.number().int().positive(),
});

export const jobListQuerySchema = z.object({
  kind: z.enum(JOB_KINDS).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  character_id: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const presignedUploadSchema = z.object({
  bucket: z.enum(['uploads', 'datasets']),
  content_type: z.string().regex(/^(image|video)\//),
  size_bytes: z.number().int().positive().max(200 * 1024 * 1024),
  purpose: z.enum(['face_image', 'reference_image', 'reference_video']),
});

export const topupCheckoutSchema = z.object({
  pack: z.enum(['pack_100', 'pack_500', 'pack_2000']),
});

export const subscriptionCheckoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'scale']),
});

export const adminCreditAdjustSchema = z.object({
  user_id: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().min(3).max(200),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CharacterCreateInput = z.infer<typeof characterCreateSchema>;
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
export type TrendSourceCreateInput = z.infer<typeof trendSourceCreateSchema>;
export type JobListQuery = z.infer<typeof jobListQuerySchema>;
export type PresignedUploadInput = z.infer<typeof presignedUploadSchema>;
