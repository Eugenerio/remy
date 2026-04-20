'use client';

import { useEffect, useState } from 'react';
import { JobStatusPill } from '@/components/job-status-pill';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/browser';

interface Snapshot {
  id: string;
  status: string;
  progress: { percent: number; stage: string; message?: string } | null;
  error: string | null;
  generation?: { id: string; outputVideoKey: string | null; decision: string } | null;
}

const TERMINAL = ['completed', 'failed', 'cancelled', 'refunded'];

export function JobStream({ id, initial }: { id: string; initial: Snapshot }) {
  const [job, setJob] = useState<Snapshot>(initial);

  useEffect(() => {
    if (TERMINAL.includes(job.status)) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const r = await fetch(`${env.API_URL}/v1/jobs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (r.ok) {
          const updated = (await r.json()) as Snapshot;
          setJob(updated);
          if (TERMINAL.includes(updated.status)) return;
        }
      } catch {
        // continue — next tick
      }
      if (!cancelled) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [id, job.status]);

  return (
    <>
      <div className="flex items-center gap-3">
        <JobStatusPill status={job.status} />
        {job.progress?.stage && (
          <span className="text-sm text-ink-2 remy-live">{job.progress.stage}</span>
        )}
      </div>
      {job.progress && <Progress value={job.progress.percent} />}
      {job.progress?.message && <p className="text-sm text-ink-3">{job.progress.message}</p>}
      {job.error && (
        <div className="rounded-md border border-rose/40 bg-rose/10 p-3 text-sm text-rose">
          {job.error}
        </div>
      )}
      {job.status === 'completed' && job.generation && (
        <div className="mt-2">
          <Button asChild>
            <Link href={`/library`}>View in library</Link>
          </Button>
        </div>
      )}
    </>
  );
}
