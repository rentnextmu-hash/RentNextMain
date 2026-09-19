import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Refreshes the Supabase auth session on every request and enforces that
// every route under /admin has an authenticated user. Unauthenticated
// visitors to /admin/* are redirected to /login?next=<original path>.
//
// This runs on every request site-wide, so it must never throw: a missing
// env var or a transient Supabase outage would otherwise 500 the entire
// site (including the public marketing pages) instead of just degrading
// the admin experience. On any failure here, admin routes fail closed
// (redirect to /login) while every other route is left untouched.
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase env vars are not configured; skipping session refresh.");
    return isAdminRoute ? redirectToLogin(request) : response;
  }

  try {
    let refreshedResponse = response;

    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          refreshedResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            refreshedResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminRoute && !user) {
      return redirectToLogin(request);
    }

    return refreshedResponse;
  } catch (error) {
    console.error("Supabase session refresh failed:", error);
    return isAdminRoute ? redirectToLogin(request) : response;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
