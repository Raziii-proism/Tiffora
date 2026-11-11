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
    const { adminEmail, adminPassword, hostelName } = await req.json();

    if (!isAdminAuthorized(adminEmail, adminPassword)) {
      return jsonResponse({ error: "Invalid admin credentials." }, 403);
    }
    if (!hostelName || !hostelName.trim()) {
      return jsonResponse({ error: "Hostel name is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing } = await adminClient
      .from("hostels")
      .select("id, name")
      .eq("name", hostelName.trim())
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "A hostel with this name already exists." }, 400);
    }

    const { data: newHostel, error: hostelError } = await adminClient
      .from("hostels")
      .insert({ name: hostelName.trim() })
      .select()
      .single();

    if (hostelError) {
      return jsonResponse({ error: hostelError.message }, 400);
    }

    return jsonResponse({ success: true, hostelId: (newHostel as { id: string }).id }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
