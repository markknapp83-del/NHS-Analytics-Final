import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Allow public access to login page and static assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static')
  ) {
    return response;
  }

  try {
    // Create Supabase client for middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[Middleware]', pathname, 'Session exists:', !!session, session?.user?.id || 'no user');

    // If no session and trying to access protected route, redirect to login
    if (!session && pathname.startsWith('/dashboard')) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // If has session and trying to access login page, redirect to dashboard
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Role-based route protection
    if (session) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const userRole = profile?.role as 'data_only' | 'sales' | 'management' | 'system_administrator' | null;

      // Settings route - admin only
      if (pathname.startsWith('/dashboard/settings')) {
        if (userRole !== 'system_administrator' && userRole !== 'management') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }

      // CRM routes - sales, management, system_administrator only
      if (pathname.startsWith('/crm')) {
        if (userRole === 'data_only') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Management routes - management and system_administrator only
        if (pathname.startsWith('/crm/management')) {
          if (userRole !== 'management' && userRole !== 'system_administrator') {
            return NextResponse.redirect(new URL('/crm/accounts', request.url));
          }
        }
      }

      // Tenders routes - sales, management, system_administrator only
      if (pathname.startsWith('/tenders')) {
        if (userRole === 'data_only') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }

      // Dashboard routes - accessible to all authenticated users
      // (no additional checks needed)
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, redirect to login to be safe
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};