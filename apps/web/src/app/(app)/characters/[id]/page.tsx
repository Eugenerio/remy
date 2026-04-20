import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Film } from '@/components/icons';
import { apiFetch } from '@/lib/api-server';
import type { CharacterDetail } from '@/lib/queries';
import { CharacterLiveDetail } from './character-client';
import { RetrainButton } from './retrain-button';
import { DeleteCharacterButton } from './delete-button';

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: CharacterDetail;
  try {
    data = await apiFetch<CharacterDetail>(`/v1/characters/${id}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) notFound();
    throw err;
  }

  return (
    <>
      <PageHeader
        eyebrow="Character"
        title={data.name}
        description={data.description ?? 'No description.'}
        actions={
          <>
            <DeleteCharacterButton characterId={data.id} characterName={data.name} />
            <RetrainButton characterId={data.id} />
            <Button asChild>
              <Link href={`/generate?character=${data.id}`}>
                <Film size={14} /> Generate video
              </Link>
            </Button>
          </>
        }
      />
      <CharacterLiveDetail id={id} initial={data} />
    </>
  );
}
