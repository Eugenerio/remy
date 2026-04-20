import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Plus } from '@/components/icons';
import { apiFetch } from '@/lib/api-server';
import type { CharacterListItem } from '@/lib/queries';
import { CharactersList } from './characters-client';

export default async function CharactersPage() {
  const data = await apiFetch<{ items: CharacterListItem[] }>('/v1/characters');
  return (
    <>
      <PageHeader
        eyebrow="Characters"
        title="Your cast."
        description="Each character keeps its own trained LoRA, references, and generation history."
        actions={
          <Button asChild>
            <Link href="/characters/new">
              <Plus size={14} /> New character
            </Link>
          </Button>
        }
      />
      <CharactersList initial={data} />
    </>
  );
}
