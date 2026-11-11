import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const { email, password, fullName, hostelId } = await req.json();

    if (!email || !password || !fullName || !hostelId) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify token using adminClient.auth.getUser(token)
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const wardenUserId = userData.user.id;

    // Verify the caller is a warden of this hostel
    const { data: warden, error: wardenError } = await adminClient
      .from("wardens")
      .select("hostel_id")
      .eq("id", wardenUserId)
      .eq("hostel_id", hostelId)
      .maybeSingle();

    if (wardenError || !warden) {
      return jsonResponse({ error: "Not authorized to add students to this hostel" }, 403);
    }

    // Create the student auth account
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError) {
      return jsonResponse({ error: authError.message }, 400);
    }

    const studentUserId = authData.user.id;

    // Insert the student row
    const { error: insertError } = await adminClient.from("students").insert({
      id: studentUserId,
      hostel_id: hostelId,
      full_name: fullName.trim(),
    });

    if (insertError) {
      // Clean up the auth user if insert fails
      await adminClient.auth.admin.deleteUser(studentUserId);
      return jsonResponse({ error: insertError.message }, 400);
    }

    return jsonResponse({ success: true, studentId: studentUserId }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
