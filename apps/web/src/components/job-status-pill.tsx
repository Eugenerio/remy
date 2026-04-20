import { Badge } from './ui/badge';

export type JobStatusPillStatus =
  | 'queued'
  | 'reserved'
  | 'preparing'
  | 'running'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

const CONFIG: Record<JobStatusPillStatus, { label: string; tone: 'neutral' | 'coral' | 'leaf' | 'amber' | 'rose' | 'slate' }> = {
  queued: { label: 'Queued', tone: 'slate' },
  reserved: { label: 'Reserved', tone: 'slate' },
  preparing: { label: 'Preparing', tone: 'amber' },
  running: { label: 'Running', tone: 'coral' },
  rendering: { label: 'Rendering', tone: 'coral' },
  uploading: { label: 'Uploading', tone: 'coral' },
  completed: { label: 'Ready', tone: 'leaf' },
  failed: { label: 'Failed', tone: 'rose' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export function JobStatusPill({ status }: { status: string }) {
  const c = CONFIG[status as JobStatusPillStatus] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={c.tone}>{c.label}</Badge>;
}
