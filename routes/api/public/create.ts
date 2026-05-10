import { createFileRoute } from "@tanstack/react-router";

const FIREBASE_DB_URL = "https://tournement-professonal-default-rtdb.firebaseio.com";

const sanitize = (u: string) => u.replace(/[.#$/[\]]/g, "_");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function userExists(sName: string): Promise<boolean> {
  const res = await fetch(`${FIREBASE_DB_URL}/users/${sName}.json?shallow=true`);
  if (!res.ok) return false;
  return (await res.json()) !== null;
}

async function findAvailableUsername(base: string): Promise<string> {
  if (!(await userExists(sanitize(base)))) return base;
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}${i}`;
    if (!(await userExists(sanitize(candidate)))) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

async function handleCreate(params: URLSearchParams, headerKey: string | null) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return json({ status: "error", message: "Server not configured" }, 500);

  const providedKey =
    params.get("api_key") ||
    params.get("apikey") ||
    headerKey ||
    "";

  // If ADMIN_API_KEY is set but no key provided, allow open access only when key empty
  if (adminKey && providedKey !== adminKey) {
    return json({ status: "error", message: "Unauthorized: invalid api_key" }, 401);
  }

  const username = (params.get("username") || "").trim();
  const password = (params.get("password") || "").trim();
  const addApiUrl = (params.get("add_url") || params.get("addApiUrl") || "").trim();
  const removeApiUrl = (params.get("remove_url") || params.get("removeApiUrl") || "").trim();
  const validity = Number(params.get("validity") || params.get("validity_day") || params.get("days") || 0);
  const botName = (params.get("bot_name") || params.get("botName") || "Bot1").trim();
  const maxInstances = Number(params.get("max_instances") || params.get("maxInstances") || 1);

  if (!username) return json({ status: "error", message: "username is required" }, 400);
  if (!password) return json({ status: "error", message: "password is required" }, 400);
  if (!addApiUrl) return json({ status: "error", message: "add_url is required" }, 400);
  if (!removeApiUrl) return json({ status: "error", message: "remove_url is required" }, 400);
  if (!validity || validity <= 0)
    return json({ status: "error", message: "validity (days) must be > 0" }, 400);

  const finalUsername = await findAvailableUsername(username);
  const sName = sanitize(finalUsername);
  const expiryDate = Date.now() + validity * 24 * 60 * 60 * 1000;

  const newUser = {
    username: finalUsername,
    password,
    expiryDate,
    maxInstances,
    allowedBots: [{ name: botName, addApiUrl, removeApiUrl }],
    role: "user",
  };

  const putRes = await fetch(`${FIREBASE_DB_URL}/users/${sName}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newUser),
  });

  if (!putRes.ok) {
    const txt = await putRes.text();
    return json({ status: "error", message: `Database error: ${putRes.status} ${txt}` }, 502);
  }

  return json({
    status: "success",
    message: "User created successfully",
    user: {
      username: finalUsername,
      password,
      validity: `${validity} days`,
      expires_at: new Date(expiryDate).toISOString(),
    },
    username_modified: finalUsername !== username,
    original_username: username,
  });
}

export const Route = createFileRoute("/api/public/create")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const headerKey =
          request.headers.get("x-api-key") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          null;
        return handleCreate(url.searchParams, headerKey);
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const params = new URLSearchParams(url.searchParams);
        // Merge JSON body into params if provided
        try {
          const ct = request.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const body = await request.json();
            for (const [k, v] of Object.entries(body || {})) {
              if (v != null) params.set(k, String(v));
            }
          } else if (ct.includes("application/x-www-form-urlencoded")) {
            const text = await request.text();
            const form = new URLSearchParams(text);
            form.forEach((v, k) => params.set(k, v));
          }
        } catch {}
        const headerKey =
          request.headers.get("x-api-key") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          null;
        return handleCreate(params, headerKey);
      },
    },
  },
});
