import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

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

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object." },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    if (
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return NextResponse.json(
        { error: "Name, email and role are required." },
        { status: 400 }
      );
    }

    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();
    const role = payload.role;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email cannot be empty." },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!["admin", "waiter", "kitchen", "billing"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid staff role." },
        { status: 400 }
      );
    }

    /*
     * Check the currently logged-in user.
     */
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

    if (userError || !user) {
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
      .single();

    if (
      adminError ||
      !adminStaff ||
      adminStaff.role !== "admin" ||
      !adminStaff.is_active
    ) {
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
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /*
     * Check whether this email already exists
     * in this restaurant's staff table.
     */
    const { data: existingStaff } = await adminSupabase
      .from("staff")
      .select("id")
      .eq("hotel_id", adminStaff.hotel_id)
      .ilike("email", email)
      .maybeSingle();

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
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });

    if (inviteError || !invitedUser.user) {
      return NextResponse.json(
        {
          error:
            inviteError?.message || "Failed to create staff account.",
        },
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
      await adminSupabase.auth.admin.deleteUser(invitedUser.user.id);

      return NextResponse.json(
        {
          error: staffError?.message || "Failed to create staff record.",
        },
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
