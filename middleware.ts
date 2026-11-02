import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Helper to preserve Supabase session cookies on redirects
  const redirectTo = (path: string) => {
    const redirectResponse = NextResponse.redirect(
      new URL(path, request.url)
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  };

  // Not logged in → login page
  if (!user) {
    return redirectTo("/login");
  }

  // Get logged-in user's staff record
  const { data: staff, error } = await supabase
    .from("staff")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
    .single();

  // Staff record not found
  if (error || !staff) {
    return redirectTo("/login");
  }

  // Inactive staff → login
  if (!staff.is_active) {
    return redirectTo("/login");
  }

  const role = staff.role;

  // Admin can access everything
  if (role === "admin") {
    return response;
  }

  // Waiter can access only waiter dashboard
  if (role === "waiter") {
    if (
      pathname === "/waiter" ||
      pathname.startsWith("/waiter/")
    ) {
      return response;
    }

    return redirectTo("/waiter");
  }

  // Kitchen can access only kitchen dashboard
  if (role === "kitchen") {
    if (
      pathname === "/kitchen" ||
      pathname.startsWith("/kitchen/")
    ) {
      return response;
    }

    return redirectTo("/kitchen");
  }

  // Billing staff can access only the billing dashboard
  if (role === "billing") {
    if (
      pathname === "/billing" ||
      pathname.startsWith("/billing/")
    ) {
      return response;
    }

    return redirectTo("/billing");
  }

  // Unknown role
  return redirectTo("/login");
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/waiter/:path*",
    "/kitchen/:path*",
    "/billing/:path*",
    "/staff/:path*",
    "/tables/:path*",
    "/menu/:path*",
    "/dashboard/:path*",
  ],
};
