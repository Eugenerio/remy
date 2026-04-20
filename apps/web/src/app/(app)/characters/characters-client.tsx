'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Characters as CharactersIcon } from '@/components/icons';
import { useCharacters, type CharacterListItem } from '@/lib/queries';

export function CharactersList({ initial }: { initial: { items: CharacterListItem[] } }) {
  const { data } = useCharacters(initial);
  const items = data?.items ?? initial.items;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CharactersIcon size={20} />}
        title="No characters yet"
        description="Upload a face and 10–20 reference photos. Remy handles the rest."
        action={
          <Button asChild>
            <Link href="/characters/new">Create your first</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <Link key={c.id} href={`/characters/${c.id}`} className="block">
          <Card className="h-full hover:border-line-2 hover:shadow-raised">
            <div
              aria-hidden
              className="h-32 rounded-t-lg border-b border-line"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklab, var(--color-coral) 18%, var(--color-paper-2)) 0%, var(--color-paper-3) 100%)',
              }}
            />
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{c.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {c.description ?? 'No description yet.'}
                </CardDescription>
              </div>
              <Badge tone={c.status === 'ready' ? 'leaf' : 'amber'}>
                {c.status === 'ready' ? 'Ready' : c.status}
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-ink-3">
              {c.generation_count} generations · {c.image_count} photos
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
