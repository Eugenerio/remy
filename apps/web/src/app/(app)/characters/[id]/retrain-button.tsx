'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Refresh } from '@/components/icons';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api';

export function RetrainButton({ characterId }: { characterId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="secondary"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await apiFetch(`/v1/characters/${characterId}/retrain`, { method: 'POST' });
          toast({ title: 'Retraining queued', tone: 'success' });
          router.refresh();
        } catch (err) {
          toast({ title: 'Could not retrain', description: (err as Error).message, tone: 'error' });
        } finally {
          setLoading(false);
        }
      }}
    >
      <Refresh size={14} /> Retrain
    </Button>
  );
}
