'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@remy/shared/schemas';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/browser';

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', name: '', acceptTerms: true },
  });

  const onSubmit = async (values: SignUpInput) => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.user && !data.session) {
        toast({
          title: 'Check your email',
          description: 'Confirm your address to activate your studio.',
          tone: 'success',
        });
      } else {
        router.push('/onboarding');
        router.refresh();
      }
    } catch (error) {
      toast({ title: 'Signup failed', description: (error as Error).message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Your name" required error={form.formState.errors.name?.message}>
        <Input autoComplete="name" {...form.register('name')} />
      </Field>
      <Field label="Email" required error={form.formState.errors.email?.message}>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field
        label="Password"
        required
        hint="At least 8 characters, with one uppercase, one lowercase, and a number."
        error={form.formState.errors.password?.message}
      >
        <Input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          defaultChecked
          {...form.register('acceptTerms')}
          className="mt-0.5 accent-coral"
        />
        <span>
          I agree to the{' '}
          <a href="/legal/terms" className="underline underline-offset-2">
            Terms
          </a>{' '}
          and{' '}
          <a href="/legal/privacy" className="underline underline-offset-2">
            Privacy
          </a>.
        </span>
      </label>
      <Button type="submit" size="lg" loading={loading} className="mt-2">
        Create studio
      </Button>
    </form>
  );
}
