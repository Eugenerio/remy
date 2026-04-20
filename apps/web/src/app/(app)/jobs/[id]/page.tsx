import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from '@/components/icons';
import { apiFetch } from '@/lib/api-server';
import type { JobDetail } from '@/lib/queries';
import { JobStream, JobBilling } from './job-stream';

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let job: JobDetail;
  try {
    job = await apiFetch<JobDetail>(`/v1/jobs/${id}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) notFound();
    throw err;
  }

  return (
    <>
      <PageHeader
        eyebrow="Job"
        title={job.kind.replaceAll('_', ' ')}
        description={`Started ${new Date(job.createdAt).toLocaleString()}`}
        actions={
          <Button asChild variant="ghost">
            <Link href="/jobs">
              <ArrowLeft size={14} /> All jobs
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Updates in real-time while the job runs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <JobStream id={job.id} initial={job} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <JobBilling id={job.id} initial={job} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
