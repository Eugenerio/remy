import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { JobStatusPill } from '@/components/job-status-pill';
import { ArrowRight, Film, SparkSmall, Trend, Characters as CharactersIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api-server';
import { cn } from '@/lib/cn';

interface CharacterSummary {
  id: string;
  name: string;
  status: string;
  image_count: number;
  generation_count: number;
  created_at: string;
}
interface JobSummary {
  id: string;
  kind: string;
  status: string;
  character?: { id: string; name: string } | null;
  generation?: { id: string; outputVideoKey: string | null; outputThumbnailKey: string | null } | null;
  createdAt: string;
}

export default async function DashboardPage() {
  const [characters, jobs] = await Promise.all([
    apiFetch<{ items: CharacterSummary[] }>('/v1/characters'),
    apiFetch<{ items: JobSummary[] }>('/v1/jobs?limit=6'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="What are we shipping today?"
        description="Trained characters, fresh trends, and recent generations — at a glance."
        actions={
          <Button asChild>
            <Link href="/generate">
              New video <ArrowRight size={14} />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Your last six jobs.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/jobs">
                All jobs <ArrowRight size={12} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {jobs.items.length === 0 ? (
              <EmptyState
                icon={<Film size={18} />}
                title="No jobs yet"
                description="Train a character, then ship your first video."
                action={
                  <Button asChild size="sm">
                    <Link href="/characters/new">Create a character</Link>
                  </Button>
                }
                className="py-10"
              />
            ) : (
              <ul className="divide-y divide-line">
                {jobs.items.map((j) => (
                  <li key={j.id} className="py-3 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-md bg-paper-3 flex items-center justify-center text-ink-2">
                      {j.kind === 'lora_training' ? <CharactersIcon size={16} /> : <Film size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {labelForKind(j.kind)}
                        </span>
                        {j.character && (
                          <Badge tone="slate">{j.character.name}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-ink-3">
                        {new Date(j.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <JobStatusPill status={j.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your characters</CardTitle>
            <CardDescription>Each one can star in unlimited videos.</CardDescription>
          </CardHeader>
          <CardContent>
            {characters.items.length === 0 ? (
              <EmptyState
                icon={<CharactersIcon size={18} />}
                title="No characters yet"
                description="Create one to unlock video generation."
                action={
                  <Button asChild size="sm">
                    <Link href="/characters/new">Create a character</Link>
                  </Button>
                }
                className="py-10"
              />
            ) : (
              <ul className="space-y-2">
                {characters.items.slice(0, 5).map((ch) => (
                  <li key={ch.id}>
                    <Link
                      href={`/characters/${ch.id}`}
                      className={cn(
                        'flex items-center gap-3 rounded-md p-2',
                        'hover:bg-paper-3 transition-colors',
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-coral/20 text-coral-ink flex items-center justify-center font-display">
                        {ch.name[0]?.toUpperCase() ?? '·'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{ch.name}</div>
                        <div className="text-xs text-ink-3">
                          {ch.generation_count} generations · {ch.image_count} images
                        </div>
                      </div>
                      <Badge tone={ch.status === 'ready' ? 'leaf' : 'amber'}>
                        {ch.status === 'ready' ? 'Ready' : ch.status}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden">
          <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-coral/15 text-coral-ink rounded-full px-3 py-1 text-xs font-medium">
                <SparkSmall size={12} />
                Ideas this week
              </div>
              <h2 className="mt-3 font-display text-3xl tracking-tight">
                Three new trends worth riding.
              </h2>
              <p className="mt-2 text-ink-2">
                Ranked by simplicity × engagement. Add a source to train Remy on your niche.
              </p>
              <div className="mt-5 flex gap-2">
                <Button asChild>
                  <Link href="/trends">
                    <Trend size={14} /> Open trends
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/generate">
                    <Film size={14} /> Generate now
                  </Link>
                </Button>
              </div>
            </div>
            <div
              className="aspect-video rounded-lg border border-line relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in oklab, var(--color-coral) 24%, var(--color-paper-2)) 0%, var(--color-paper-3) 100%)',
              }}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

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
    case 'outfit_analysis':
      return 'Outfit analysis';
    default:
      return kind;
  }
}
