import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getAuthResolutionState,
  getStaffRedirectPath,
  getStaffResolutionState,
} from "./lib/staff-route-access";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Keep refreshed Supabase cookies on redirects and temporary failures.
  const redirectTo = (path: string) => {
    const redirectResponse = NextResponse.redirect(
      new URL(path, request.url)
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  };

  const serviceUnavailable = () => {
    const unavailableResponse = new NextResponse(
      "Authentication is temporarily unavailable. Please try again.",
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "30",
        },
      }
    );

    response.cookies.getAll().forEach((cookie) => {
      unavailableResponse.cookies.set(cookie);
    });

    return unavailableResponse;
  };

  const logFailure = (stage: string, error: unknown) => {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";

    // Do not log tokens, request headers, or raw provider error messages.
    console.error(`[middleware] ${stage} failed`, { code });
  };

  try {
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

    const authResult = await supabase.auth.getUser();
    const authState = getAuthResolutionState(
      authResult.error,
      authResult.data.user
    );

    if (authState === "unavailable") {
      logFailure("Supabase Auth lookup", authResult.error);
      return serviceUnavailable();
    }

    if (authState === "unauthenticated" || !authResult.data.user) {
      return redirectTo("/login");
    }

    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("role, is_active")
      .eq("auth_user_id", authResult.data.user.id)
      .maybeSingle();

    const staffState = getStaffResolutionState(staffError, staff);

    if (staffState === "unavailable") {
      logFailure("staff record lookup", staffError);
      return serviceUnavailable();
    }

    if (staffState === "unauthorized" || !staff) {
      return redirectTo("/login");
    }

    const redirectPath = getStaffRedirectPath(staff.role, pathname);
    if (redirectPath) {
      return redirectTo(redirectPath);
    }

    return response;
  } catch (error) {
    logFailure("unexpected protected-route middleware", error);
    return serviceUnavailable();
  }
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
