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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
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

    const { students, hostelId } = await req.json();

    if (!students || !Array.isArray(students) || !hostelId) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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

    const domain = "wisdomhomes.in";
    const results: Array<{ name: string; email: string; password: string; status: string; error?: string }> = [];
    const usedSlugs = new Set<string>();

    // Get existing auth user emails to avoid collisions
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    const existingEmails = new Set(
      (existingUsers?.users || []).map((u) => u.email?.toLowerCase() || "")
    );

    for (const rawName of students) {
      const fullName = String(rawName).trim();
      if (!fullName) continue;

      let base = slugify(fullName);
      if (!base) base = "student";

      let slug = base;
      let suffix = 1;
      while (usedSlugs.has(slug) || existingEmails.has(`${slug}@${domain}`)) {
        slug = `${base}${suffix}`;
        suffix++;
      }
      usedSlugs.add(slug);

      const email = `${slug}@${domain}`;
      const password = "Wh@2026student!";

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        results.push({ name: fullName, email, password, status: "failed", error: authError.message });
        continue;
      }

      const studentUserId = authData.user.id;

      // Insert student row
      const { error: insertError } = await adminClient.from("students").insert({
        id: studentUserId,
        hostel_id: hostelId,
        full_name: fullName,
      });

      if (insertError) {
        await adminClient.auth.admin.deleteUser(studentUserId);
        results.push({ name: fullName, email, password, status: "failed", error: insertError.message });
        continue;
      }

      results.push({ name: fullName, email, password, status: "created" });
    }

    return jsonResponse({ success: true, results }, 200);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
