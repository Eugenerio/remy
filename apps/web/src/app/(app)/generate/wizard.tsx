'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Film, SparkSmall } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { CREDIT_COSTS } from '@remy/shared/credits';

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

type Duration = 5 | 10 | 15;
type Resolution = '720p' | '1080p';

export function GenerateWizard({
  characters,
  suggested,
  preselectSuggested,
  preselectCharacter,
}: {
  characters: CharacterSummary[];
  suggested: SuggestedVideo[];
  preselectSuggested: string | null;
  preselectCharacter: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [characterId, setCharacterId] = useState<string | null>(
    preselectCharacter ?? characters.find((c) => c.status === 'ready')?.id ?? null,
  );
  const [suggestedId, setSuggestedId] = useState<string | null>(preselectSuggested);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [duration, setDuration] = useState<Duration>(5);
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [outfitOverride, setOutfitOverride] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const character = characters.find((c) => c.id === characterId);
  const selectedSuggested = suggested.find((s) => s.id === suggestedId);
  const effectiveRefUrl = suggestedId ? selectedSuggested?.url : referenceUrl;

  const cost = duration <= 5 ? CREDIT_COSTS.VIDEO_GENERATION_SHORT : CREDIT_COSTS.VIDEO_GENERATION_LONG;

  const canGenerate = useMemo(
    () => Boolean(character && character.status === 'ready' && effectiveRefUrl),
    [character, effectiveRefUrl],
  );

  const generate = async () => {
    if (!character || !effectiveRefUrl) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ job_id: string; reserved_credits: number }>(
        '/v1/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            character_id: character.id,
            suggested_video_id: suggestedId ?? undefined,
            reference_video_url: suggestedId ? undefined : referenceUrl,
            duration_seconds: duration,
            resolution,
            outfit_override: outfitOverride || undefined,
            confirm_credit_cost: cost,
          }),
        },
      );
      toast({
        title: 'Generation started',
        description: `${res.reserved_credits} credits reserved. We'll notify you when it's done.`,
        tone: 'success',
      });
      router.push(`/jobs/${res.job_id}`);
    } catch (err) {
      toast({ title: 'Could not start', description: (err as Error).message, tone: 'error' });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>1. Character</CardTitle>
            <CardDescription>Only characters with a ready LoRA are selectable.</CardDescription>
          </CardHeader>
          <CardContent>
            {characters.length === 0 ? (
              <p className="text-sm text-ink-3">
                You don't have any characters yet.{' '}
                <Link href="/characters/new" className="text-coral-ink underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {characters.map((c) => {
                  const ready = c.status === 'ready';
                  const active = characterId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!ready}
                      onClick={() => setCharacterId(c.id)}
                      className={`text-left rounded-md border p-3 transition ${
                        active
                          ? 'bg-ink text-paper border-ink'
                          : ready
                            ? 'bg-paper-2 border-line hover:border-line-2'
                            : 'bg-paper-2 border-line opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-display text-lg">{c.name}</div>
                      <div className={`text-xs ${active ? 'text-paper/70' : 'text-ink-3'}`}>
                        {ready ? 'Ready' : c.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Motion reference</CardTitle>
            <CardDescription>
              Pick a trending video, or paste a TikTok URL directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="TikTok URL">
              <Input
                placeholder="https://tiktok.com/@user/video/…"
                value={suggestedId ? selectedSuggested?.url ?? '' : referenceUrl}
                onChange={(e) => {
                  setSuggestedId(null);
                  setReferenceUrl(e.target.value);
                }}
              />
            </Field>
            {suggested.length > 0 && (
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-3">
                  Or pick from your trending feed
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {suggested.slice(0, 8).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSuggestedId(v.id);
                        setReferenceUrl('');
                      }}
                      className={`relative aspect-[9/16] overflow-hidden rounded-md border transition ${
                        suggestedId === v.id
                          ? 'border-coral ring-2 ring-coral/40'
                          : 'border-line hover:border-line-2'
                      }`}
                    >
                      {v.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-paper-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Output</CardTitle>
            <CardDescription>Longer and higher resolution cost more.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Duration">
              <div className="flex gap-2">
                {[5, 10, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d as Duration)}
                    className={`h-10 flex-1 rounded-md border text-sm font-medium ${
                      duration === d ? 'bg-ink text-paper border-ink' : 'bg-paper-2 border-line text-ink-2'
                    }`}
                  >
                    {d} seconds
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Resolution">
              <div className="flex gap-2">
                {(['720p', '1080p'] as Resolution[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={`h-10 flex-1 rounded-md border text-sm font-medium ${
                      resolution === r ? 'bg-ink text-paper border-ink' : 'bg-paper-2 border-line text-ink-2'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Field>
            <Field
              label="Outfit override"
              hint="Optional. Leave blank and Remy will analyze the reference video's outfit itself."
            >
              <Textarea
                value={outfitOverride}
                onChange={(e) => setOutfitOverride(e.target.value)}
                placeholder="A cream oversized knit sweater, pleated mini skirt, chunky white sneakers, silver hoop earrings."
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <aside className="sticky top-6 h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Double-check before we reserve credits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Character" value={character?.name ?? '—'} />
            <Row
              label="Reference"
              value={
                suggestedId
                  ? `@${selectedSuggested?.creator_handle ?? selectedSuggested?.source.label ?? '—'}`
                  : referenceUrl || '—'
              }
            />
            <Row label="Duration" value={`${duration} seconds`} />
            <Row label="Resolution" value={resolution} />
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-3">Credit cost</span>
                <span className="font-display text-2xl tabular-nums">{cost}</span>
              </div>
              <p className="mt-1 text-xs text-ink-3 flex items-start gap-1">
                <SparkSmall size={12} className="mt-0.5 text-coral" />
                Charged on success. Failures mid-way refund 50%, earlier failures full.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={!canGenerate}
              onClick={() => setConfirmOpen(true)}
            >
              <Film size={14} /> Generate
            </Button>
            {character && character.status !== 'ready' && (
              <Badge tone="amber">Character LoRA still training — wait for Ready</Badge>
            )}
          </CardContent>
        </Card>
      </aside>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>Reserve {cost} credits?</DialogTitle>
          <DialogDescription>
            We'll reserve the credits now and charge them on success. A partial refund is applied if rendering fails.
          </DialogDescription>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={generate}>
              Yes, reserve & generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium truncate max-w-[200px] text-right">{value}</span>
    </div>
  );
}
