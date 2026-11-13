
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

    const { action, studentId } = await req.json();

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

    return response({ error: "Invalid action." }, 400);
  } catch (error) {
    console.error("Admin student management error:", error);
    return response({ error: "An unexpected server error occurred." }, 500);
  }
});
