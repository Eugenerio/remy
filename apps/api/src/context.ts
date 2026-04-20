import type { User } from '@prisma/client';

export type AuthUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'supabaseUserId'>;

export interface AppVariables {
  requestId: string;
  startedAt: number;
  user?: AuthUser;
  accessToken?: string;
}

export type AppEnv = {
  Variables: AppVariables;
};
