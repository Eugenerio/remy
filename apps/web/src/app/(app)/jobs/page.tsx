import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api-server';
import type { JobListItem } from '@/lib/queries';
import { JobsList } from './jobs-client';

export default async function JobsPage() {
  const data = await apiFetch<{ items: JobListItem[] }>('/v1/jobs?limit=50');
  return (
    <>
      <PageHeader
        eyebrow="Jobs"
        title="All jobs."
        description="Everything Remy has run for you."
      />
      <JobsList initial={data} />
    </>
  );
}
