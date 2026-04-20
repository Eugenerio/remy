import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api-server';
import { TrendsClient, type TrendSource, type SuggestedVideo } from './trends-client';

export default async function TrendsPage() {
  const [sources, suggested] = await Promise.all([
    apiFetch<{ items: TrendSource[] }>('/v1/trends/sources'),
    apiFetch<{ items: SuggestedVideo[] }>('/v1/trends/suggested?simple_only=true&limit=30'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Trends"
        title="What should we remake next?"
        description="Point Remy at a few sources. We'll suggest the ones worth your time."
      />
      <TrendsClient initialSources={sources.items} initialSuggested={suggested.items} />
    </>
  );
}
