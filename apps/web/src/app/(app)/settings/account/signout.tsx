'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/browser';

export function SignOut() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
