'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from '@/components/icons';
import { apiFetch } from '@/lib/api';

export function OnboardingCompleteButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await apiFetch('/v1/me/onboard', { method: 'POST' });
          router.push('/characters/new');
        } finally {
          setLoading(false);
        }
      }}
    >
      Start creating <ArrowRight size={14} />
    </Button>
  );
}
