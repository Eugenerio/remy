import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '../env';

const PROTECTED = [
  '/dashboard',
  '/characters',
  '/trends',
  '/library',
  '/generate',
  '/jobs',
  '/settings',
  '/admin',
  '/onboarding',
];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = path === '/login' || path === '/signup';

  // Fast path: paths that don't care about auth state at all (landing, legal,
  // assets, etc.) don't need Supabase work. Skip the client instantiation
  // entirely — saves ~30–60ms per request.
  if (!needsAuth && !isAuthPage) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getSession reads the cookie and returns the stored session — no network
  // round-trip to Supabase (unlike getUser). The API verifies tokens on
  // every authenticated call, so this is safe: the worst a forged/stale
  // cookie gets is the React shell + a 401 from the first data fetch.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}
