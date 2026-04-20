import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api-server';
import { GenerateWizard } from './wizard';

interface CharacterSummary {
  id: string;
  name: string;
  status: string;
}
interface SuggestedVideo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  creator_handle: string | null;
  caption: string | null;
  duration_seconds: number | null;
  rank_score: number;
  source: { handle: string; label: string | null; kind: string };
}

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ suggested?: string; character?: string }>;
}) {
  const { suggested, character } = await searchParams;
  const [characters, trendsData] = await Promise.all([
    apiFetch<{ items: CharacterSummary[] }>('/v1/characters'),
    apiFetch<{ items: SuggestedVideo[] }>('/v1/trends/suggested?simple_only=true&limit=24'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Generate"
        title="Make a video."
        description="Pick a character, a motion reference, and a duration. We'll handle the rest."
      />
      <GenerateWizard
        characters={characters.items}
        suggested={trendsData.items}
        preselectSuggested={suggested ?? null}
        preselectCharacter={character ?? null}
      />
    </>
  );
}
