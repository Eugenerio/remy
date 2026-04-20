'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { JobStatusPill } from '@/components/job-status-pill';
import { Film } from '@/components/icons';
import { useJobs, type JobListItem } from '@/lib/queries';

function labelForKind(kind: string): string {
  switch (kind) {
    case 'lora_training':
      return 'Character training';
    case 'video_generation':
      return 'Video generation';
    case 'video_regeneration':
      return 'Video regeneration';
    case 'trend_ingest':
      return 'Trend ingest';
    default:
      return kind;
  }
}

export function JobsList({ initial }: { initial: { items: JobListItem[] } }) {
  const { data } = useJobs(initial);
  const items = data?.items ?? initial.items;

  if (items.length === 0) {
    return <EmptyState icon={<Film size={20} />} title="No jobs yet" />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-line">
          {items.map((j) => (
            <li key={j.id}>
              <Link
                href={`/jobs/${j.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-paper-3 transition"
              >
                <div className="flex-1">
                  <div className="font-medium">{labelForKind(j.kind)}</div>
                  <div className="text-xs text-ink-3">
                    {j.character?.name && <span>{j.character.name} · </span>}
                    {new Date(j.createdAt).toLocaleString()}
                  </div>
                </div>
                {j.progress?.stage && (
                  <span className="text-xs text-ink-3">{j.progress.stage}</span>
                )}
                <JobStatusPill status={j.status} />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
