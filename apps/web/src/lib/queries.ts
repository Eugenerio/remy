'use client';

import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { apiFetch } from './api';

/**
 * Canonical query keys. One source of truth lets us invalidate from anywhere
 * (after mutations) without typos.
 */
export const qk = {
  me: () => ['me'] as const,
  characters: () => ['characters'] as const,
  character: (id: string) => ['character', id] as const,
  trendSources: () => ['trends', 'sources'] as const,
  trendSuggested: () => ['trends', 'suggested'] as const,
  jobs: (filter?: Record<string, unknown>) => ['jobs', filter ?? {}] as const,
  job: (id: string) => ['job', id] as const,
  library: (filter?: Record<string, unknown>) => ['library', filter ?? {}] as const,
  billing: () => ['billing'] as const,
  adminUsers: () => ['admin', 'users'] as const,
  adminFailed: () => ['admin', 'failed'] as const,
};

const ACTIVE_JOB_STATUSES = new Set([
  'queued',
  'reserved',
  'preparing',
  'running',
  'rendering',
  'uploading',
]);

/** Compute a refetchInterval based on whether the payload shows active work. */
function pollIfActive<T>(
  pickActive: (data: T | undefined) => boolean,
  hot = 2_000,
  cold = 15_000,
): (query: { state: { data: T | undefined } }) => number | false {
  return (query) => {
    if (!query.state.data) return hot;
    return pickActive(query.state.data) ? hot : cold;
  };
}

// --------------------------------------------------------------------------
// Hooks
// --------------------------------------------------------------------------

export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'user' | 'admin';
    onboarded_at: string | null;
    avatar_url: string | null;
  };
  balance: {
    current: number;
    pending: number;
    available: number;
    lifetimeGranted: number;
    lifetimeSpent: number;
  };
  subscription: {
    plan: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    plan_details: { id: string; name: string; monthlyCredits: number };
  };
}

export function useMe(initial?: MeResponse) {
  return useQuery<MeResponse>({
    queryKey: qk.me(),
    queryFn: () => apiFetch<MeResponse>('/v1/me'),
    initialData: initial,
    // Refetch every 10s — balance changes after mutations (generate, buy).
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export interface CharacterListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  image_count: number;
  generation_count: number;
  created_at: string;
  updated_at: string;
}

export function useCharacters(initial?: { items: CharacterListItem[] }) {
  return useQuery({
    queryKey: qk.characters(),
    queryFn: () => apiFetch<{ items: CharacterListItem[] }>('/v1/characters'),
    initialData: initial,
    refetchInterval: pollIfActive<{ items: CharacterListItem[] }>(
      (d) => (d?.items ?? []).some((c) => c.status !== 'ready' && c.status !== 'failed'),
      3_000,
      20_000,
    ),
  });
}

export interface CharacterDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  generation_count: number;
  activeLora: { status: string; version: number; trainedOn: string | null } | null;
  dataset: {
    faceImageKey: string;
    referenceImageKeys: string[];
    imageCount: number;
    status: string;
    faceImageUrl: string | null;
    referenceImageUrls: string[];
  } | null;
  loras: { id: string; version: number; status: string; createdAt: string }[];
  jobs: {
    id: string;
    status: string;
    progress: { percent: number; stage: string; message?: string } | null;
    createdAt: string;
  }[];
}

export function useCharacter(id: string, initial?: CharacterDetail) {
  return useQuery({
    queryKey: qk.character(id),
    queryFn: () => apiFetch<CharacterDetail>(`/v1/characters/${id}`),
    initialData: initial,
    refetchInterval: pollIfActive<CharacterDetail>((d) => {
      const job = d?.jobs[0];
      return Boolean(job && ACTIVE_JOB_STATUSES.has(job.status));
    }, 1_500, 30_000),
  });
}

export interface JobListItem {
  id: string;
  kind: string;
  status: string;
  character?: { id: string; name: string } | null;
  generation?: {
    id: string;
    outputVideoKey: string | null;
    outputThumbnailKey: string | null;
    decision: string;
  } | null;
  progress?: { percent: number; stage: string } | null;
  createdAt: string;
}

export function useJobs(initial?: { items: JobListItem[] }) {
  return useQuery({
    queryKey: qk.jobs(),
    queryFn: () => apiFetch<{ items: JobListItem[] }>('/v1/jobs?limit=50'),
    initialData: initial,
    refetchInterval: pollIfActive<{ items: JobListItem[] }>(
      (d) => (d?.items ?? []).some((j) => ACTIVE_JOB_STATUSES.has(j.status)),
      2_000,
      15_000,
    ),
  });
}

export interface JobDetail {
  id: string;
  kind: string;
  status: string;
  progress: { percent: number; stage: string; message?: string } | null;
  reservedCredits: number;
  chargedCredits: number;
  refundedCredits: number;
  createdAt: string;
  finishedAt: string | null;
  error: string | null;
  character?: { id: string; name: string } | null;
  generation?: {
    id: string;
    outputVideoKey: string | null;
    outputThumbnailKey: string | null;
    decision: string;
  } | null;
}

export function useJob(id: string, initial?: JobDetail) {
  return useQuery({
    queryKey: qk.job(id),
    queryFn: () => apiFetch<JobDetail>(`/v1/jobs/${id}`),
    initialData: initial,
    refetchInterval: pollIfActive<JobDetail>(
      (d) => Boolean(d && ACTIVE_JOB_STATUSES.has(d.status)),
      1_500,
      30_000,
    ),
  });
}

// --------------------------------------------------------------------------
// Cache invalidation helpers — call after mutations
// --------------------------------------------------------------------------

export function useInvalidators() {
  const qc = useQueryClient();
  return {
    me: () => qc.invalidateQueries({ queryKey: qk.me() }),
    characters: () => qc.invalidateQueries({ queryKey: qk.characters() }),
    character: (id: string) => qc.invalidateQueries({ queryKey: qk.character(id) }),
    jobs: () => qc.invalidateQueries({ queryKey: qk.jobs() }),
    job: (id: string) => qc.invalidateQueries({ queryKey: qk.job(id) }),
    library: () => qc.invalidateQueries({ queryKey: qk.library() }),
    billing: () => qc.invalidateQueries({ queryKey: qk.billing() }),
    trends: () => qc.invalidateQueries({ queryKey: ['trends'] }),
    /** After any credit-consuming action — refresh balance + jobs together. */
    afterGenerate: () => {
      qc.invalidateQueries({ queryKey: qk.me() });
      qc.invalidateQueries({ queryKey: qk.jobs() });
    },
  };
}
