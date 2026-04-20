'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Upload as UploadIcon, Trash, Check } from '@/components/icons';
import { apiFetch } from '@/lib/api';

interface Uploaded {
  key: string;
  preview: string;
  name: string;
  purpose: 'face_image' | 'reference_image';
}

async function presignAndUpload(file: File, purpose: Uploaded['purpose']): Promise<Uploaded> {
  const pres = await apiFetch<{ key: string; upload_url: string; public_url: string }>(
    '/v1/uploads/presign',
    {
      method: 'POST',
      body: JSON.stringify({
        bucket: 'uploads',
        content_type: file.type || 'image/jpeg',
        size_bytes: file.size,
        purpose,
      }),
    },
  );
  const put = await fetch(pres.upload_url, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return { key: pres.key, preview: URL.createObjectURL(file), name: file.name, purpose };
}

export function NewCharacterWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [face, setFace] = useState<Uploaded | null>(null);
  const [refs, setRefs] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.length > 0 && face && refs.length >= 10 && refs.length <= 20 && !submitting;

  const handleFaceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const up = await presignAndUpload(file, 'face_image');
      setFace(up);
    } catch (err) {
      toast({ title: 'Upload failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleRefsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results: Uploaded[] = [];
      for (const file of files) {
        results.push(await presignAndUpload(file, 'reference_image'));
      }
      setRefs((prev) => [...prev, ...results].slice(0, 20));
    } catch (err) {
      toast({ title: 'Upload failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!face || refs.length < 10) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ id: string; training_job_id: string; reserved_credits: number }>(
        '/v1/characters',
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: description || undefined,
            faceImageKey: face.key,
            referenceImageKeys: refs.map((r) => r.key),
          }),
        },
      );
      toast({
        title: 'Training started',
        description: `${res.reserved_credits} credits reserved for this job.`,
        tone: 'success',
      });
      router.push(`/characters/${res.id}`);
    } catch (err) {
      toast({ title: 'Could not start training', description: (err as Error).message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>What should we call this character?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Selene Quinn" />
            </Field>
            <Field
              label="Description"
              hint="Optional — helpful for your own memory. Doesn't influence generation."
            >
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A 23-year-old editorial model with short platinum hair, soft features, and a clean Scandinavian aesthetic."
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Face photo</CardTitle>
            <CardDescription>
              One sharp, well-lit, front-facing headshot. This anchors the identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {face ? (
              <div className="flex items-center gap-3">
                <img
                  src={face.preview}
                  alt="face"
                  className="h-20 w-20 rounded-md border border-line object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium truncate">{face.name}</div>
                  <div className="text-xs text-ink-3">Uploaded</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFace(null)}>
                  <Trash size={14} /> Remove
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-paper-2 py-10 cursor-pointer hover:bg-paper-3 transition">
                <UploadIcon size={22} className="text-ink-2" />
                <span className="mt-2 text-sm font-medium">Upload face photo</span>
                <span className="text-xs text-ink-3">JPG/PNG, under 10MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFaceChange} />
              </label>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference photos</CardTitle>
            <CardDescription>
              10–20 shots showing the character from different angles, poses, and outfits. More variety = better LoRA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {refs.map((r, i) => (
                <div key={r.key} className="group relative aspect-square rounded-md overflow-hidden border border-line">
                  <img src={r.preview} alt={`ref ${i}`} className="h-full w-full object-cover" />
                  <button
                    className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-6 w-6 rounded bg-paper/90 text-ink"
                    onClick={() => setRefs((prev) => prev.filter((x) => x.key !== r.key))}
                    aria-label="Remove"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))}
              {refs.length < 20 && (
                <label className="aspect-square flex flex-col items-center justify-center rounded-md border border-dashed border-line-2 bg-paper-2 cursor-pointer hover:bg-paper-3 transition">
                  <UploadIcon size={16} className="text-ink-2" />
                  <span className="mt-1 text-xs text-ink-3">Add more</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleRefsChange}
                  />
                </label>
              )}
            </div>
            <div className="mt-3 text-xs text-ink-3">
              {refs.length} of 10–20 uploaded
              {uploading && ' · uploading…'}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="sticky top-6 h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Ready to train?</CardTitle>
            <CardDescription>
              We'll reserve 200 credits and kick off training. You'll be able to generate videos once it's ready (~20 minutes).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <Checkline ok={name.length > 0}>Character named</Checkline>
              <Checkline ok={!!face}>Face photo uploaded</Checkline>
              <Checkline ok={refs.length >= 10}>
                {refs.length} reference{refs.length === 1 ? '' : 's'} (need 10–20)
              </Checkline>
            </ul>
            <Button className="mt-4 w-full" size="lg" loading={submitting} disabled={!canSubmit} onClick={submit}>
              Start training · 200 credits
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Checkline({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={ok ? 'text-leaf' : 'text-ink-3'}>
        <Check size={14} />
      </span>
      <span className={ok ? 'text-ink' : 'text-ink-3'}>{children}</span>
    </li>
  );
}
