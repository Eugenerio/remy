'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { JobStatusPill } from '@/components/job-status-pill';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Edit, Film, Plus, Spinner, Trash, Upload as UploadIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { apiFetch } from '@/lib/api';
import { useCharacter, useInvalidators, type CharacterDetail } from '@/lib/queries';

const ACTIVE = new Set([
  'queued',
  'reserved',
  'preparing',
  'running',
  'rendering',
  'uploading',
]);

export function CharacterLiveDetail({
  id,
  initial,
}: {
  id: string;
  initial: CharacterDetail;
}) {
  const { data } = useCharacter(id, initial);
  const ch = data ?? initial;
  const latestJob = ch.jobs[0];
  const isTraining = latestJob && ACTIVE.has(latestJob.status);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <IdentityCard character={ch} />
        <TrainingCard character={ch} isTraining={Boolean(isTraining)} />
        <GalleryCard character={ch} />
      </div>
      <div className="flex flex-col gap-6">
        <StatsCard character={ch} />
        <DatasetCard character={ch} />
      </div>
    </div>
  );
}

function IdentityCard({ character }: { character: CharacterDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <CardTitle>Identity</CardTitle>
          <CardDescription className="whitespace-pre-wrap">
            {character.description ?? 'No description yet.'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Edit size={14} /> Edit
        </Button>
      </CardHeader>
      <EditDialog
        open={open}
        onOpenChange={setOpen}
        id={character.id}
        initialName={character.name}
        initialDescription={character.description ?? ''}
      />
    </Card>
  );
}

function EditDialog({
  open,
  onOpenChange,
  id,
  initialName,
  initialDescription,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  id: string;
  initialName: string;
  initialDescription: string;
}) {
  const { toast } = useToast();
  const invalidate = useInvalidators();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await apiFetch(`/v1/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      invalidate.character(id);
      invalidate.characters();
      toast({ title: 'Character updated', tone: 'success' });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Update failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit character</DialogTitle>
        <DialogDescription>
          Changes update the metadata only. They don&apos;t affect the trained LoRA.
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description" hint="Helpful for your own memory. Doesn't influence generation.">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={loading} onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrainingCard({
  character,
  isTraining,
}: {
  character: CharacterDetail;
  isTraining: boolean;
}) {
  const latestJob = character.jobs[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Training</CardTitle>
        <CardDescription>
          Status, progress, and history of the LoRA training jobs for this character.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {latestJob ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <JobStatusPill status={latestJob.status} />
              <span className="text-sm text-ink-3">
                {new Date(latestJob.createdAt).toLocaleString()}
              </span>
              <Link
                href={`/jobs/${latestJob.id}`}
                className="ml-auto text-xs text-coral-ink hover:underline"
              >
                View job →
              </Link>
            </div>
            {isTraining && latestJob.progress && (
              <>
                <Progress value={latestJob.progress.percent ?? 0} />
                <div className="text-sm text-ink-2">
                  <span className="remy-live font-medium">{latestJob.progress.stage}</span>
                  {' · '}
                  {Math.round(latestJob.progress.percent)}%
                  {latestJob.progress.message ? ` · ${latestJob.progress.message}` : ''}
                </div>
              </>
            )}
            {character.loras.length > 0 && (
              <ul className="divide-y divide-line rounded-md border border-line">
                {character.loras.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Badge tone={l.status === 'ready' ? 'leaf' : 'slate'}>v{l.version}</Badge>
                    <span className="text-sm">{l.status}</span>
                    <span className="ml-auto text-xs text-ink-3">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-ink-3">No training jobs yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

const MAX_REFERENCES = 40;

async function presignAndUpload(file: File): Promise<string> {
  const extension = (file.type.split('/')[1] ?? 'bin').replace(/[^a-zA-Z0-9]/g, '');
  const pres = await apiFetch<{ key: string; upload_url: string }>('/v1/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({
      bucket: 'uploads',
      content_type: file.type || 'image/jpeg',
      size_bytes: file.size,
      purpose: 'reference_image',
    }),
  });
  const put = await fetch(pres.upload_url, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return pres.key;
  void extension;
}

function GalleryCard({ character }: { character: CharacterDetail }) {
  const dataset = character.dataset;
  const { toast } = useToast();
  const invalidate = useInvalidators();
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const addReferences = async (files: FileList | null) => {
    if (!files || files.length === 0 || !dataset) return;
    const spaceLeft = MAX_REFERENCES - dataset.referenceImageKeys.length;
    const toUpload = Array.from(files).slice(0, spaceLeft);
    if (toUpload.length === 0) {
      toast({
        title: 'Reference cap reached',
        description: `You already have ${dataset.referenceImageKeys.length} references.`,
        tone: 'error',
      });
      return;
    }
    setUploading(true);
    try {
      const keys: string[] = [];
      for (const file of toUpload) {
        keys.push(await presignAndUpload(file));
      }
      await apiFetch(`/v1/characters/${character.id}/references`, {
        method: 'POST',
        body: JSON.stringify({ referenceImageKeys: keys }),
      });
      invalidate.character(character.id);
      invalidate.characters();
      toast({
        title: `${keys.length} reference${keys.length === 1 ? '' : 's'} added`,
        description:
          character.activeLora?.status === 'ready'
            ? 'Retrain the LoRA to incorporate them.'
            : undefined,
        tone: 'success',
      });
    } catch (err) {
      toast({ title: 'Upload failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const removeReference = async (key: string) => {
    if (!dataset) return;
    setDeletingKey(key);
    try {
      await apiFetch(`/v1/characters/${character.id}/references`, {
        method: 'DELETE',
        body: JSON.stringify({ referenceImageKey: key }),
      });
      invalidate.character(character.id);
      invalidate.characters();
      toast({ title: 'Reference removed', tone: 'success' });
    } catch (err) {
      toast({ title: 'Remove failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setDeletingKey(null);
    }
  };

  if (!dataset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reference photos</CardTitle>
          <CardDescription>Upload photos first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const refCount = dataset.referenceImageKeys.length;
  const atCap = refCount >= MAX_REFERENCES;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Reference photos</CardTitle>
          <CardDescription>
            Face anchors identity; references cover angles, poses, outfits. Up to {MAX_REFERENCES}.
          </CardDescription>
        </div>
        <label
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md',
            'text-sm font-medium bg-paper-2 text-ink border border-line-2',
            'hover:bg-paper-3 cursor-pointer transition',
            (uploading || atCap) && 'opacity-60 cursor-not-allowed pointer-events-none',
          )}
        >
          {uploading ? (
            <>
              <Spinner className="animate-spin" size={14} /> Uploading…
            </>
          ) : (
            <>
              <Plus size={14} /> Add more
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading || atCap}
            onChange={(e) => {
              void addReferences(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        {dataset.faceImageUrl && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-3">Face</div>
            <div className="h-40 w-40 overflow-hidden rounded-lg border border-line bg-paper-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataset.faceImageUrl}
                alt="face"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-ink-3">
            <span>References ({refCount}/{MAX_REFERENCES})</span>
            {atCap && <span className="text-amber">at cap</span>}
          </div>
          {dataset.referenceImageUrls.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {dataset.referenceImageUrls.map((url, i) => {
                const key = dataset.referenceImageKeys[i];
                return (
                  <div
                    key={key ?? i}
                    className="group relative aspect-square overflow-hidden rounded-md border border-line bg-paper-3"
                  >
                    <a href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`ref ${i + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </a>
                    {key && (
                      <button
                        onClick={() => removeReference(key)}
                        disabled={deletingKey === key}
                        className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-6 w-6 rounded bg-paper/90 text-ink-2 hover:text-rose disabled:opacity-60"
                        aria-label="Remove"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
              {!atCap && (
                <label className="aspect-square flex flex-col items-center justify-center rounded-md border border-dashed border-line-2 bg-paper-2 hover:bg-paper-3 cursor-pointer transition">
                  <UploadIcon size={18} className="text-ink-2" />
                  <span className="mt-1 text-xs text-ink-3">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      void addReferences(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-3">No references yet. Upload to begin.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCard({ character }: { character: CharacterDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Stat label="Status" value={
          <Badge tone={character.activeLora?.status === 'ready' ? 'leaf' : 'amber'}>
            {character.activeLora?.status ?? 'no LoRA'}
          </Badge>
        } />
        <Stat label="Generations" value={<span className="tabular-nums">{character.generation_count}</span>} />
        <Stat label="Created" value={new Date(character.createdAt).toLocaleDateString()} />
        <Stat label="Updated" value={new Date(character.updatedAt).toLocaleDateString()} />
        {character.activeLora?.trainedOn && (
          <Stat
            label="Trained"
            value={new Date(character.activeLora.trainedOn).toLocaleDateString()}
          />
        )}
        <div className="pt-2">
          <Button asChild className="w-full" size="sm">
            <Link href={`/generate?character=${character.id}`}>
              <Film size={14} /> Generate video
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function DatasetCard({ character }: { character: CharacterDetail }) {
  const ds = character.dataset;
  if (!ds) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset</CardTitle>
        <CardDescription>What we used to train this character.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Stat
          label="Status"
          value={<Badge tone={ds.status === 'ready' ? 'leaf' : 'amber'}>{ds.status}</Badge>}
        />
        <Stat label="Image count" value={ds.imageCount} />
      </CardContent>
    </Card>
  );
}
