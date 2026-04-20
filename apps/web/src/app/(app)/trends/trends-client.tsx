'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Plus, Trash, ExternalLink, Film, Trend } from '@/components/icons';
import { apiFetch } from '@/lib/api';

export interface TrendSource {
  id: string;
  kind: 'tiktok_creator' | 'tiktok_hashtag' | 'category';
  handle: string;
  label: string;
  active: boolean;
  video_count: number;
  last_ingest_at: string | null;
}

export interface SuggestedVideo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  creator_handle: string | null;
  caption: string | null;
  duration_seconds: number | null;
  rank_score: number;
  engagement_score: number;
  simplicity_score: number;
  source: { handle: string; label: string | null; kind: string };
}

export function TrendsClient({
  initialSources,
  initialSuggested,
}: {
  initialSources: TrendSource[];
  initialSuggested: SuggestedVideo[];
}) {
  const { toast } = useToast();
  const [sources, setSources] = useState(initialSources);
  const [suggested] = useState(initialSuggested);
  const [handle, setHandle] = useState('');
  const [kind, setKind] = useState<TrendSource['kind']>('tiktok_creator');
  const [submitting, setSubmitting] = useState(false);

  const onAdd = async () => {
    if (!handle.trim()) return;
    setSubmitting(true);
    try {
      const sanitized = handle.replace(/^@|^#/, '');
      const res = await apiFetch<TrendSource>('/v1/trends/sources', {
        method: 'POST',
        body: JSON.stringify({ kind, handle: sanitized, label: sanitized }),
      });
      setSources((prev) => [{ ...res, video_count: 0, last_ingest_at: null } as TrendSource, ...prev]);
      setHandle('');
      toast({
        title: 'Source added',
        description: 'We kicked off an initial ingest. New videos will appear shortly.',
        tone: 'success',
      });
    } catch (err) {
      toast({ title: 'Could not add source', description: (err as Error).message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    await apiFetch(`/v1/trends/sources/${id}`, { method: 'DELETE' });
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Add a source</CardTitle>
            <CardDescription>
              Creators, hashtags, or broad categories. We ingest every 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {(['tiktok_creator', 'tiktok_hashtag', 'category'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 h-8 rounded-md text-xs font-medium border transition ${
                    kind === k ? 'bg-ink text-paper border-ink' : 'bg-paper-2 text-ink-2 border-line'
                  }`}
                >
                  {k === 'tiktok_creator' ? 'Creator' : k === 'tiktok_hashtag' ? 'Hashtag' : 'Category'}
                </button>
              ))}
            </div>
            <Field label="Handle">
              <Input
                placeholder={kind === 'category' ? 'dance, cosplay, transitions' : kind === 'tiktok_hashtag' ? '#pov' : '@charlidamelio'}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </Field>
            <Button className="w-full" loading={submitting} onClick={onAdd}>
              <Plus size={14} /> Track
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your sources</CardTitle>
            <CardDescription>
              {sources.length} tracked · {sources.reduce((a, s) => a + s.video_count, 0)} videos indexed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-ink-3">No sources yet. Add one to get ideas.</p>
            ) : (
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-paper-3 transition"
                  >
                    <Badge tone="slate">{s.kind.replace('tiktok_', '')}</Badge>
                    <span className="font-medium truncate flex-1">{s.label || s.handle}</span>
                    <span className="text-xs text-ink-3">{s.video_count}</span>
                    <button
                      onClick={() => onDelete(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-rose p-1"
                      aria-label="Remove"
                    >
                      <Trash size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </aside>

      <section>
        {suggested.length === 0 ? (
          <EmptyState
            icon={<Trend size={20} />}
            title="No suggestions yet"
            description="Give us a few minutes after adding a source. Ingest runs are async and take ~30 seconds."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.map((v) => (
              <div key={v.id} className="group">
                <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-line bg-paper-3">
                  {v.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-3 text-xs">
                      no thumbnail
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 text-[10px] text-paper bg-gradient-to-t from-ink/80 to-transparent">
                    <div className="flex items-center justify-between">
                      <span>{v.creator_handle ? `@${v.creator_handle}` : v.source.label}</span>
                      <span>{v.duration_seconds ? `${v.duration_seconds}s` : ''}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-md bg-paper/90 text-ink p-1.5"
                      aria-label="Open on TikTok"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Score tone="coral" label="rank" value={v.rank_score} />
                    <Score tone="leaf" label="eng" value={v.engagement_score} />
                  </div>
                  <Button asChild size="xs" variant="secondary">
                    <Link href={`/generate?suggested=${v.id}`}>
                      <Film size={12} /> Remake
                    </Link>
                  </Button>
                </div>
                {v.caption && (
                  <p className="mt-1 text-xs text-ink-3 line-clamp-2">{v.caption}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Score({ tone, label, value }: { tone: 'coral' | 'leaf'; label: string; value: number }) {
  const color = tone === 'coral' ? 'text-coral-ink' : 'text-leaf';
  return (
    <span className={`font-medium ${color}`}>
      {label} {(value * 100).toFixed(0)}
    </span>
  );
}
