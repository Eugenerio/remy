export const JOB_KINDS = [
  'lora_training',
  'outfit_analysis',
  'reference_image',
  'outfit_image',
  'video_generation',
  'video_regeneration',
  'trend_ingest',
  'trend_analysis',
] as const;

export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_STATUSES = [
  'queued',
  'reserved',
  'preparing',
  'running',
  'rendering',
  'uploading',
  'completed',
  'failed',
  'cancelled',
  'refunded',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const TERMINAL_STATUSES: readonly JobStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'refunded',
];

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Refund rules — determines what happens to reserved credits when a job ends.
 * Applied by the API worker on terminal-status webhooks from the AI service.
 */
export const REFUND_RULES: Record<JobStatus, 'full' | 'partial' | 'none'> = {
  queued: 'full',
  reserved: 'full',
  preparing: 'full',
  running: 'partial',
  rendering: 'partial',
  uploading: 'none',
  completed: 'none',
  failed: 'full',
  cancelled: 'full',
  refunded: 'none',
};

/**
 * Partial refund fraction — when a job fails mid-pipeline (e.g. running/rendering),
 * we refund this fraction of reserved credits. The remainder covers compute cost.
 */
export const PARTIAL_REFUND_FRACTION = 0.5;

export interface JobProgress {
  /** 0..100 */
  percent: number;
  stage: string;
  eta_seconds?: number | null;
  message?: string | null;
}
