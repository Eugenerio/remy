import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { Film, Play } from '@/components/icons';
import { apiFetch } from '@/lib/api-server';

interface Item {
  id: string;
  character: { id: string; name: string };
  duration_seconds: number;
  resolution: string;
  decision: string;
  created_at: string;
  video_url: string | null;
  thumbnail_url: string | null;
  reference_video_url: string | null;
}

export default async function LibraryPage() {
  const data = await apiFetch<{ items: Item[] }>('/v1/library');

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Everything you've generated."
        description="Approved, pending, and discarded. Click any to review."
        actions={
          <Button asChild>
            <Link href="/generate">
              <Film size={14} /> New video
            </Link>
          </Button>
        }
      />
      {data.items.length === 0 ? (
        <EmptyState
          icon={<Film size={20} />}
          title="Nothing here yet"
          description="Your generations will show up here once complete."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((it) => (
            <Card key={it.id} className="overflow-hidden">
              <div className="relative aspect-[9/16] bg-paper-3">
                {it.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-ink-3 text-xs">
                    no preview
                  </div>
                )}
                {it.video_url && (
                  <a
                    href={it.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-ink/40 transition"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink">
                      <Play size={20} />
                    </span>
                  </a>
                )}
                <Badge
                  tone={
                    it.decision === 'approved'
                      ? 'leaf'
                      : it.decision === 'discarded'
                        ? 'rose'
                        : it.decision === 'regenerated'
                          ? 'amber'
                          : 'slate'
                  }
                  className="absolute top-2 left-2"
                >
                  {it.decision}
                </Badge>
              </div>
              <CardContent className="pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{it.character.name}</span>
                  <span className="text-xs text-ink-3">
                    {it.duration_seconds}s · {it.resolution}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-3">
                  {new Date(it.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
