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
    const { studentId } = await req.json();

    // Safe diagnostic log: reveals only existence and length, never token content
    console.log(
      `[delete-student] Auth check: token exists = ${Boolean(token)}, length = ${token ? token.length : 0}`
    );

    if (!token) {
      console.warn("[delete-student] Auth rejection: missing token in Authorization header");
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    if (!studentId) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client for privileged database and auth admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.warn(
        `[delete-student] Auth verification failed: ${userError?.message || "No user returned"}`
      );
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("hostel_id")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      return jsonResponse({ error: "Could not load student" }, 500);
    }
    if (!student) {
      return jsonResponse({ error: "Student not found" }, 404);
    }

    const { data: warden, error: wardenError } = await adminClient
      .from("wardens")
      .select("hostel_id")
      .eq("id", userData.user.id)
      .eq("hostel_id", student.hostel_id)
      .maybeSingle();

    if (wardenError || !warden) {
      return jsonResponse({ error: "Not authorized to remove this student" }, 403);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(studentId);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
