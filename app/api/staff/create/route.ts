import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { escapePostgrestIlikePattern } from "@/lib/postgrest-patterns";
import {
  getStaffCreationAdminEnvironment,
  getSupabasePublicEnvironment,
} from "@/lib/env";
import {
  getStaffCreationAdminState,
  getStaffCreationAuthState,
} from "@/lib/staff-creation-access";
import { validateStaffPayload } from "@/lib/staff-validation";

function serviceUnavailableResponse() {
  return NextResponse.json(
    { error: "Unable to verify your staff access. Please try again." },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "30",
      },
    }
  );
}

function logSupabaseLookupFailure(stage: string, error: unknown) {
  const details: { code?: string; status?: number } = {};

  if (typeof error === "object" && error !== null) {
    if ("code" in error && typeof error.code === "string") {
      details.code = error.code;
    }

    if ("status" in error && typeof error.status === "number") {
      details.status = error.status;
    }
  }

  // Avoid logging raw provider messages, request headers, or session tokens.
  console.error("[staff-create] " + stage + " failed", details);
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const validation = validateStaffPayload(body);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name, email, role } = validation.value;

    /*
     * Check the currently logged-in user.
     */
    const publicEnvironment = getSupabasePublicEnvironment(process.env);
    const cookieStore = await cookies();

    const supabase = createServerClient(
      publicEnvironment.url,
      publicEnvironment.publishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Cookie refresh is not required here.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const authState = getStaffCreationAuthState(userError, user);

    if (authState === "unavailable") {
      logSupabaseLookupFailure("Supabase Auth lookup", userError);
      return serviceUnavailableResponse();
    }

    if (authState === "unauthenticated" || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    /*
     * Verify that the logged-in user is an active admin.
     */
    const { data: adminStaff, error: adminError } = await supabase
      .from("staff")
      .select("id, hotel_id, role, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const adminState = getStaffCreationAdminState(adminError, adminStaff);

    if (adminState === "unavailable") {
      logSupabaseLookupFailure("admin staff lookup", adminError);
      return serviceUnavailableResponse();
    }

    if (adminState === "forbidden" || !adminStaff) {
      return NextResponse.json(
        { error: "Only active admins can create staff accounts." },
        { status: 403 }
      );
    }

    /*
     * Server-only Supabase client.
     *
     * This key MUST NEVER be exposed to the browser.
     */
    const adminEnvironment = getStaffCreationAdminEnvironment(process.env);
    const adminSupabase = createClient(
      publicEnvironment.url,
      adminEnvironment.serviceRoleKey
    );

    /*
     * Check whether this email already exists
     * in this restaurant's staff table.
     */
    const {
      data: existingStaff,
      error: existingStaffError,
    } = await adminSupabase
      .from("staff")
      .select("id")
      .eq("hotel_id", adminStaff.hotel_id)
      .ilike("email", escapePostgrestIlikePattern(email))
      .maybeSingle();

    if (existingStaffError) {
      console.error("Check existing staff error:", existingStaffError);

      return NextResponse.json(
        {
          error:
            "Unable to verify whether this staff member already exists. Please try again.",
        },
        { status: 500 }
      );
    }

    if (existingStaff) {
      return NextResponse.json(
        { error: "A staff member with this email already exists." },
        { status: 409 }
      );
    }

    /*
     * Create Supabase Auth account and send invitation email.
     */
    const { data: invitedUser, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: adminEnvironment.siteUrl + "/auth/callback",
      });

    if (inviteError || !invitedUser.user) {
      console.error(
        "Staff invitation failed:",
        inviteError ?? new Error("Supabase did not return an invited user.")
      );

      return NextResponse.json(
        { error: "Unable to send the staff invitation. Please try again." },
        { status: 500 }
      );
    }

    /*
     * Create the staff record.
     */
    const { data: staffMember, error: staffError } = await adminSupabase
      .from("staff")
      .insert({
        hotel_id: adminStaff.hotel_id,
        name,
        email,
        role,
        is_active: true,
        auth_user_id: invitedUser.user.id,
      })
      .select("id")
      .single();

    /*
     * If staff creation fails, remove the Auth account
     * so we don't leave an orphaned user.
     */
    if (staffError || !staffMember) {
      console.error(
        "Staff record creation failed:",
        staffError ?? new Error("Supabase did not return a staff record.")
      );

      try {
        const { error: cleanupError } =
          await adminSupabase.auth.admin.deleteUser(invitedUser.user.id);

        if (cleanupError) {
          console.error(
            "Failed to remove the invited Auth user after staff creation failed:",
            cleanupError
          );
        }
      } catch (cleanupError) {
        console.error(
          "Unexpected error while removing the invited Auth user:",
          cleanupError
        );
      }

      return NextResponse.json(
        { error: "Unable to create the staff record. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      staff_id: staffMember.id,
      message: "Staff account created and invitation sent.",
    });
  } catch (error) {
    console.error("Create staff error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
