import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import {
  authRoutes,
  teacherRoutes,
  publicTeacherRoutes,
  publicRoutes,
  adminRoutes,
} from "@/constants/routes";
import { getTenantFromRequest } from "@/lib/tenant";

export async function updateSession(request: NextRequest) {
  // Detect tenant from subdomain FIRST, before any other processing
  const tenant = getTenantFromRequest(request);

  // Track if we need to rewrite the path
  let shouldRewrite = false;
  let rewrittenPath = request.nextUrl.pathname;

  // If we have a tenant subdomain and we're on the root path, rewrite to tenant route
  if (tenant.tenantSlug && request.nextUrl.pathname === "/") {
    rewrittenPath = `/${tenant.tenantSlug}`;
    shouldRewrite = true;
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // If we need to rewrite the path, create a rewrite response
  if (shouldRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = rewrittenPath;
    const rewrittenResponse = NextResponse.rewrite(url, { request });
    // Copy all cookies from supabaseResponse to rewrittenResponse
    const cookies = supabaseResponse.cookies.getAll();
    cookies.forEach((cookie) => {
      rewrittenResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    supabaseResponse = rewrittenResponse;
  }

  // Use rewritten path for route checks if we rewrote it
  const pathnameToCheck = shouldRewrite
    ? rewrittenPath
    : request.nextUrl.pathname;

  // Public routes that don't require authentication
  const allPublicRoutes = [
    publicRoutes.home,
    ...publicTeacherRoutes,
    authRoutes.confirm,
    authRoutes.error,
    adminRoutes.login,
  ];

  const isPublicRoute = allPublicRoutes.some((route) =>
    pathnameToCheck.startsWith(route)
  );

  // Check if route is admin route
  const isAdminRoute = pathnameToCheck.startsWith("/admin");

  // Allow public routes and student routes (they use Telegram auth)
  const isStudentRoute =
    pathnameToCheck.startsWith("/") &&
    !pathnameToCheck.startsWith("/teachers") &&
    !pathnameToCheck.startsWith("/auth") &&
    !pathnameToCheck.startsWith("/api") &&
    !pathnameToCheck.startsWith("/admin");

  // Check student route access - verify role if user is authenticated
  if (isStudentRoute && user && !isPublicRoute) {
    // Get user role from app_metadata (lightweight check in middleware)
    // Full role validation happens in requireStudentAuth
    const userRole = (user.app_metadata as { role?: string })?.role;
    if (userRole && userRole !== "student") {
      // Non-student trying to access student routes - redirect to home
      const url = request.nextUrl.clone();
      url.pathname = publicRoutes.home;
      return NextResponse.redirect(url);
    }
  }

  if (
    !isPublicRoute &&
    !isStudentRoute &&
    !isAdminRoute &&
    !user &&
    pathnameToCheck.startsWith("/teachers")
  ) {
    // Redirect unauthenticated teacher routes to login
    const url = request.nextUrl.clone();
    url.pathname = teacherRoutes.login;
    return NextResponse.redirect(url);
  }

  // Check admin route access - verify authentication and role
  if (isAdminRoute && !isPublicRoute && !user) {
    // Redirect unauthenticated admin routes to login
    const url = request.nextUrl.clone();
    url.pathname = adminRoutes.login;
    return NextResponse.redirect(url);
  }

  // Check admin route access - verify role if user is authenticated
  if (isAdminRoute && !isPublicRoute && user) {
    // Get user role from app_metadata (lightweight check in middleware)
    // Full role validation happens in requireSuperAdminAuth
    const userRole = (user.app_metadata as { role?: string })?.role;
    if (userRole && userRole !== "platform_admin") {
      // Non-platform-admin trying to access admin routes - redirect to home
      const url = request.nextUrl.clone();
      url.pathname = publicRoutes.home;
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
