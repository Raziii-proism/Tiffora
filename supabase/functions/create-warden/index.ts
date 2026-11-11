import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "mhdrazikp2007@gmail.com";
const ADMIN_PASSWORD = "Razi@2007";

function isAdminAuthorized(email?: string, password?: string): boolean {
  return !!email && !!password && email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { adminEmail, adminPassword, email, password, hostelId } = await req.json();

    if (!isAdminAuthorized(adminEmail, adminPassword)) {
      return new Response(
        JSON.stringify({ error: "Invalid admin credentials." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email || !password || !hostelId) {
      return new Response(
        JSON.stringify({ error: "Email, password, and hostel are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the hostel exists
    const { data: hostel, error: hostelLookupError } = await adminClient
      .from("hostels")
      .select("id, name")
      .eq("id", hostelId)
      .maybeSingle();

    if (hostelLookupError || !hostel) {
      return new Response(
        JSON.stringify({ error: "Selected hostel does not exist." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the warden auth account
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wardenUserId = authData.user.id;

    // Insert the warden row
    const { error: wardenError } = await adminClient.from("wardens").insert({
      id: wardenUserId,
      hostel_id: hostelId,
    });

    if (wardenError) {
      // Clean up the auth user if insert fails
      await adminClient.auth.admin.deleteUser(wardenUserId);
      return new Response(
        JSON.stringify({ error: wardenError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, wardenId: wardenUserId, hostelId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
