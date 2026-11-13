
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function createSession(email: string, secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ email, exp: expiresAt }))
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const { email, password } = await req.json();

    const expectedEmail = Deno.env.get("ADMIN_EMAIL");
    const expectedPassword = Deno.env.get("ADMIN_PASSWORD");
    const sessionSecret = Deno.env.get("ADMIN_SESSION_SECRET");

    if (!expectedEmail || !expectedPassword || !sessionSecret) {
      return jsonResponse({ error: "Admin server configuration is missing." }, 500);
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase() ||
      password !== expectedPassword
    ) {
      return jsonResponse({ error: "Invalid admin credentials." }, 403);
    }

    const token = await createSession(expectedEmail, sessionSecret);

    return jsonResponse({
      authorized: true,
      token,
      expiresIn: 1800,
    });
  } catch {
    return jsonResponse({ error: "Unable to verify admin login." }, 500);
  }
});
