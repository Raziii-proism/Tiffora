import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim();

    if (!token) {
      console.warn("[create-student] Missing access token");
      return jsonResponse({ error: "Authentication required. Please sign in again." }, 401);
    }

    const { email, password, fullName, hostelId } = await req.json();

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof fullName !== "string" ||
      typeof hostelId !== "string" ||
      !email.trim() ||
      !password ||
      !fullName.trim()
    ) {
      return jsonResponse({ error: "Missing or invalid required fields" }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[create-student] Missing server configuration");
      return jsonResponse({ error: "Server configuration is incomplete" }, 500);
    }

    // Service-role client for privileged database and auth operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify token directly using admin client against Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      console.warn(
        "[create-student] Token verification failed:",
        authError?.message || "User not found"
      );
      return jsonResponse({ error: "Invalid or expired session. Please sign in again." }, 401);
    }

    // Confirm the authenticated user is a warden of this hostel.
    const { data: warden, error: wardenError } = await adminClient
      .from("wardens")
      .select("id, hostel_id")
      .eq("id", user.id)
      .eq("hostel_id", hostelId)
      .maybeSingle();

    if (wardenError) {
      console.error("[create-student] Warden lookup failed:", wardenError.message);
      return jsonResponse({ error: "Could not verify warden permissions" }, 500);
    }

    if (!warden) {
      return jsonResponse(
        { error: "Not authorized to add students to this hostel" },
        403
      );
    }

    // Create the student's authentication account.
    const { data: authData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (createError || !authData.user) {
      return jsonResponse(
        { error: createError?.message || "Could not create student account" },
        400
      );
    }

    const studentUserId = authData.user.id;

    // Add the student to the hostel.
    const { error: insertError } = await adminClient
      .from("students")
      .insert({
        id: studentUserId,
        hostel_id: hostelId,
        full_name: fullName.trim(),
      });

    if (insertError) {
      const { error: rollbackError } =
        await adminClient.auth.admin.deleteUser(studentUserId);

      if (rollbackError) {
        console.error("[create-student] Rollback failed:", rollbackError.message);
      }

      return jsonResponse({ error: insertError.message }, 400);
    }

    return jsonResponse({
      success: true,
      message: "Student created successfully",
      studentId: studentUserId,
    });
  } catch (err) {
    console.error(
      "[create-student] Unexpected error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return jsonResponse({ error: "An unexpected server error occurred" }, 500);
  }
});
