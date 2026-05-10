import { createFileRoute } from "@tanstack/react-router";

const FIREBASE_DB_URL = "https://tournement-professonal-default-rtdb.firebaseio.com";

const sanitize = (u: string) => u.replace(/[.#$/[\]]/g, "_");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function userExists(sName: string): Promise<boolean> {
  const res = await fetch(`${FIREBASE_DB_URL}/users/${sName}.json?shallow=true`);
  if (!res.ok) return false;
  const data = await res.json();
  return data !== null;
}

async function findAvailableUsername(base: string): Promise<string> {
  const sBase = sanitize(base);
  if (!(await userExists(sBase))) return base;
  // Try numeric suffixes
  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}${i}`;
    if (!(await userExists(sanitize(candidate)))) return candidate;
  }
  // Fallback random
  return `${base}${Date.now().toString(36)}`;
}

export const Route = createFileRoute("/api/public/create-user")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        try {
          const adminKey = process.env.ADMIN_API_KEY;
          if (!adminKey) return json({ status: "error", message: "Server not configured" }, 500);

          let body: any = {};
          try {
            body = await request.json();
          } catch {
            return json({ status: "error", message: "Invalid JSON body" }, 400);
          }

          const providedKey =
            body.api_key ||
            body.apiKey ||
            request.headers.get("x-api-key") ||
            request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

          if (providedKey !== adminKey) {
            return json({ status: "error", message: "Unauthorized: invalid API key" }, 401);
          }

          const username = (body.username || "").toString().trim();
          const password = (body.password || "").toString().trim();
          const addApiUrl = (body.addApiUrl || body.friend_add_url || body.friendAddUrl || "").toString().trim();
          const removeApiUrl = (body.removeApiUrl || body.friend_remove_url || body.friendRemoveUrl || "").toString().trim();
          const validityDays = Number(body.validityDays || body.validity_days || body.validity || 0);
          const botName = (body.botName || body.bot_name || "Bot1").toString().trim();
          const maxInstances = Number(body.maxInstances || body.max_instances || 1);

          if (!username) return json({ status: "error", message: "username is required" }, 400);
          if (!password) return json({ status: "error", message: "password is required" }, 400);
          if (!addApiUrl) return json({ status: "error", message: "addApiUrl is required" }, 400);
          if (!removeApiUrl) return json({ status: "error", message: "removeApiUrl is required" }, 400);
          if (!validityDays || validityDays <= 0)
            return json({ status: "error", message: "validityDays must be > 0" }, 400);

          // Smart unique username
          const finalUsername = await findAvailableUsername(username);
          const sName = sanitize(finalUsername);
          const expiryDate = Date.now() + validityDays * 24 * 60 * 60 * 1000;

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
            message: "User created",
            username: finalUsername,
            password,
            validity: `${validityDays} days`,
            expiryDate,
            expiryDateISO: new Date(expiryDate).toISOString(),
            usernameModified: finalUsername !== username,
            originalUsername: username,
          });
        } catch (e: any) {
          return json({ status: "error", message: e?.message || "Internal error" }, 500);
        }
      },
    },
  },
});
