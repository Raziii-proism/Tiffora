import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "mhdrazikp2007@gmail.com";
const ADMIN_PASSWORD = "Razi@2007";

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isAdminAuthorized(email?: string, password?: string): boolean {
  return !!email && !!password && email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { adminEmail, adminPassword, hostelId } = await req.json();

    if (!isAdminAuthorized(adminEmail, adminPassword)) {
      return jsonResponse({ error: "Invalid admin credentials." }, 403);
    }
    if (!hostelId) {
      return jsonResponse({ error: "Hostel ID is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify hostel exists
    const { data: hostel, error: hostelError } = await adminClient
      .from("hostels")
      .select("id, name")
      .eq("id", hostelId)
      .maybeSingle();

    if (hostelError || !hostel) {
      return jsonResponse({ error: "Hostel not found." }, 404);
    }

    // Get wardens and students to clean up their auth accounts
    const [{ data: wardens }, { data: students }] = await Promise.all([
      adminClient.from("wardens").select("id").eq("hostel_id", hostelId),
      adminClient.from("students").select("id").eq("hostel_id", hostelId),
    ]);

    // Delete hostel (cascades to public tables: students, wardens, bills, absences, mess_leaves, expense_items, menu_items)
    const { error: deleteError } = await adminClient
      .from("hostels")
      .delete()
      .eq("id", hostelId);

    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400);
    }

    // Clean up auth users
    const userIdsToDelete = [
      ...(wardens || []).map((w: { id: string }) => w.id),
      ...(students || []).map((s: { id: string }) => s.id),
    ];

    for (const uid of userIdsToDelete) {
      try {
        await adminClient.auth.admin.deleteUser(uid);
      } catch {
        // ignore if already deleted
      }
    }

    return jsonResponse({ success: true, hostelName: hostel.name }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
