
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
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
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({
      error: "Method not allowed."
    }, 405);
  }

  try {
    const {
      adminEmail,
      adminPassword,
      hostelId
    } = await req.json();

    const expectedEmail =
      Deno.env.get("ADMIN_EMAIL");

    const expectedPassword =
      Deno.env.get("ADMIN_PASSWORD");

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const adminUserId =
      Deno.env.get("ADMIN_USER_ID");

    if (
      !expectedEmail ||
      !expectedPassword ||
      !supabaseUrl ||
      !serviceRoleKey ||
      !adminUserId
    ) {
      return jsonResponse({
        error: "Server configuration missing."
      }, 500);
    }

    // Verify using the same credentials as verify-admin
    if (
      typeof adminEmail !== "string" ||
      typeof adminPassword !== "string" ||
      adminEmail.trim().toLowerCase() !==
        expectedEmail.trim().toLowerCase() ||
      adminPassword !== expectedPassword
    ) {
      return jsonResponse({
        error: "Invalid admin credentials."
      }, 403);
    }

    if (typeof hostelId !== "string" || !hostelId) {
      return jsonResponse({
        error: "Hostel ID is required."
      }, 400);
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: hostel, error: hostelError } =
      await adminClient
        .from("hostels")
        .select("id, name")
        .eq("id", hostelId)
        .maybeSingle();

    if (hostelError) {
      return jsonResponse({
        error: "Unable to retrieve hostel."
      }, 500);
    }

    if (!hostel) {
      return jsonResponse({
        error: "Hostel not found."
      }, 404);
    }

    const [wardens, students] = await Promise.all([
      adminClient
        .from("wardens")
        .select("id")
        .eq("hostel_id", hostelId),

      adminClient
        .from("students")
        .select("id")
        .eq("hostel_id", hostelId),
    ]);

    if (wardens.error || students.error) {
      return jsonResponse({
        error: "Unable to retrieve hostel accounts."
      }, 500);
    }

    const userIds = [
      ...new Set([
        ...(wardens.data || []).map(w => w.id),
        ...(students.data || []).map(s => s.id),
      ]),
    ];

    if (userIds.includes(adminUserId)) {
      return jsonResponse({
        error: "Cannot delete hostel linked to admin."
      }, 409);
    }

    const { error: deleteError } = await adminClient
      .from("hostels")
      .delete()
      .eq("id", hostelId);

    if (deleteError) {
      return jsonResponse({
        error: deleteError.message
      }, 400);
    }

    let failedAccounts = 0;

    for (const uid of userIds) {
      try {
        const { error } =
          await adminClient.auth.admin.deleteUser(uid);

        if (error) failedAccounts++;
      } catch {
        failedAccounts++;
      }
    }

    return jsonResponse({
      success: true,
      hostelName: hostel.name,
      failedAccounts,
      warning: failedAccounts > 0
        ? "Some accounts require manual cleanup."
        : null,
    });

  } catch (err) {
    console.error("Delete hostel error:", err);

    return jsonResponse({
      error: "An unexpected server error occurred."
    }, 500);
  }
});
