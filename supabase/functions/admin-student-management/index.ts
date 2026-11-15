
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Session",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifyAdminSession(token: string, secret: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      new TextEncoder().encode(payload)
    );

    if (!validSignature) return false;

    const session = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload))
    );

    return (
      typeof session.email === "string" &&
      typeof session.exp === "number" &&
      session.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function generateTemporaryPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!";
  const bytes = crypto.getRandomValues(new Uint8Array(20));

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
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
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed." }, 405);
  }

  try {
    const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET");
    const token = req.headers.get("X-Admin-Session");

    if (!sessionSecret || !token || !(await verifyAdminSession(token, sessionSecret))) {
      return response({ error: "Admin session expired. Please log in again." }, 403);
    }

    const body = await req.json();
    const { action, studentId, email, password, fullName, hostelId, students } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return response({ error: "Server configuration is incomplete." }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (action === "list") {
      const [
        { data: students, error: studentError },
        { data: hostels, error: hostelError },
      ] = await Promise.all([
        adminClient.from("students").select("*").order("full_name"),
        adminClient.from("hostels").select("id, name"),
      ]);

      if (studentError || hostelError) {
        return response({
          error: studentError?.message || hostelError?.message,
        }, 500);
      }

      const usersById = new Map<string, string>();
      let page = 1;

      while (true) {
        const { data, error } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

        if (error) {
          return response({ error: error.message }, 500);
        }

        for (const user of data.users) {
          if (user.email) usersById.set(user.id, user.email);
        }

        if (data.users.length < 1000) break;
        page++;
      }

      const hostelNames = new Map(
        (hostels || []).map((hostel) => [hostel.id, hostel.name])
      );

      const result = (students || []).map((student) => ({
        id: student.id,
        full_name: student.full_name,
        email: usersById.get(student.id) || "",
        hostel_id: student.hostel_id,
        hostel_name: hostelNames.get(student.hostel_id) || "Unknown Hostel",
        room_no: student.room_no,
      }));

      return response({ success: true, students: result });
    }

    if (action === "reset") {
      if (typeof studentId !== "string" || !studentId) {
        return response({ error: "Student ID is required." }, 400);
      }

      const { data: student, error: studentError } = await adminClient
        .from("students")
        .select("id, full_name")
        .eq("id", studentId)
        .maybeSingle();

      if (studentError || !student) {
        return response({ error: "Student not found." }, 404);
      }

      const temporaryPassword = generateTemporaryPassword();

      const { error: updateError } =
        await adminClient.auth.admin.updateUserById(studentId, {
          password: temporaryPassword,
        });

      if (updateError) {
        return response({ error: updateError.message }, 400);
      }

      return response({
        success: true,
        message: "Student password reset successfully.",
        studentName: student.full_name,
        temporaryPassword,
      });
    }

    if (action === "create") {
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof fullName !== "string" ||
        typeof hostelId !== "string" ||
        !email.trim() ||
        !password ||
        !fullName.trim() ||
        !hostelId
      ) {
        return response({ error: "Missing or invalid required fields." }, 400);
      }

      if (password.length < 6) {
        return response({ error: "Password must be at least 6 characters." }, 400);
      }

      const { data: hostel, error: hostelError } = await adminClient
        .from("hostels")
        .select("id")
        .eq("id", hostelId)
        .maybeSingle();

      if (hostelError || !hostel) {
        return response({ error: "Selected hostel does not exist." }, 404);
      }

      const { data: authData, error: createError } =
        await adminClient.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
        });

      if (createError || !authData.user) {
        return response(
          { error: createError?.message || "Could not create student account." },
          400
        );
      }

      const studentUserId = authData.user.id;

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
          console.error("Rollback failed:", rollbackError.message);
        }

        return response({ error: insertError.message }, 400);
      }

      return response({
        success: true,
        message: "Student created successfully.",
        studentId: studentUserId,
      });
    }

    if (action === "bulk-create") {
      if (!students || !Array.isArray(students) || !hostelId) {
        return response({ error: "Missing required fields (hostelId, students array)." }, 400);
      }

      const { data: hostel, error: hostelError } = await adminClient
        .from("hostels")
        .select("id")
        .eq("id", hostelId)
        .maybeSingle();

      if (hostelError || !hostel) {
        return response({ error: "Selected hostel does not exist." }, 404);
      }

      const domain = "wisdomhomes.in";
      const results: Array<{ name: string; email: string; password: string; status: string; error?: string }> = [];
      const usedSlugs = new Set<string>();

      const { data: existingUsers } = await adminClient.auth.admin.listUsers({
        perPage: 1000,
      });
      const existingEmails = new Set(
        (existingUsers?.users || []).map((u) => u.email?.toLowerCase() || "")
      );

      for (const rawName of students) {
        const studentFullName = String(rawName).trim();
        if (!studentFullName) continue;

        let base = slugify(studentFullName);
        if (!base) base = "student";

        let slug = base;
        let suffix = 1;
        while (usedSlugs.has(slug) || existingEmails.has(`${slug}@${domain}`)) {
          slug = `${base}${suffix}`;
          suffix++;
        }
        usedSlugs.add(slug);

        const studentEmail = `${slug}@${domain}`;
        const studentPassword = "Wh@2026student!";

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: studentEmail,
          password: studentPassword,
          email_confirm: true,
        });

        if (authError) {
          results.push({ name: studentFullName, email: studentEmail, password: studentPassword, status: "failed", error: authError.message });
          continue;
        }

        const studentUserId = authData.user.id;

        const { error: insertError } = await adminClient.from("students").insert({
          id: studentUserId,
          hostel_id: hostelId,
          full_name: studentFullName,
        });

        if (insertError) {
          await adminClient.auth.admin.deleteUser(studentUserId);
          results.push({ name: studentFullName, email: studentEmail, password: studentPassword, status: "failed", error: insertError.message });
          continue;
        }

        results.push({ name: studentFullName, email: studentEmail, password: studentPassword, status: "created" });
      }

      return response({ success: true, results });
    }

    return response({ error: "Invalid action." }, 400);
  } catch (error) {
    console.error("Admin student management error:", error);
    return response({ error: "An unexpected server error occurred." }, 500);
  }
});
