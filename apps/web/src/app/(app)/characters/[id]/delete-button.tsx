'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Trash } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api';
import { useInvalidators } from '@/lib/queries';

export function DeleteCharacterButton({
  characterId,
  characterName,
}: {
  characterId: string;
  characterName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const invalidate = useInvalidators();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await apiFetch(`/v1/characters/${characterId}`, { method: 'DELETE' });
      invalidate.characters();
      invalidate.me();
      toast({ title: 'Character deleted', tone: 'success' });
      router.push('/characters');
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Trash size={14} /> Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Delete {characterName}?</DialogTitle>
          <DialogDescription>
            This removes the character, its dataset, the trained LoRA, all
            generations, and cancels any running jobs (reserved credits
            refund to your balance). Cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={loading} onClick={confirm}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
