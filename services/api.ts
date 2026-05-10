// The Service now accepts the full URL pattern from the user config
// and replaces {target_uid} with the actual UID.

// Helper: Delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Fetch with timeout
const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Helper: Recursive Search for keys in JSON with Smart Object Penetration
const findValueRecursive = (obj: any, keyRegex: RegExp, searchInsideObject = false): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;

    // Handle Arrays: iterate elements
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const res = findValueRecursive(item, keyRegex, searchInsideObject);
            if (res) return res;
        }
        return undefined;
    }

    const keys = Object.keys(obj);

    // 1. Check top-level keys first
    for (const key of keys) {
        if (keyRegex.test(key)) {
            const val = obj[key];
            
            // Case A: Found a string URL
            if (typeof val === 'string' && val.length > 4) {
                return val;
            }
            
            // Case B: Found an object, search inside it for generic image keys if requested
            if (searchInsideObject && typeof val === 'object' && val !== null) {
                const innerUrl = findValueRecursive(val, /^(url|src|href|icon|img|image|link|pic|source)$/i, false);
                if (innerUrl) return innerUrl;
            }
        }
    }

    // 2. Dive deeper into other objects
    for (const key of keys) {
        if (typeof obj[key] === 'object') {
            const result = findValueRecursive(obj[key], keyRegex, searchInsideObject);
            if (result) return result;
        }
    }
    
    return undefined;
};

// Race direct + CORS proxies in parallel; first successful response wins
const fetchWithCorsFallback = async (url: string, timeout = 8000): Promise<{ ok: boolean; status: number; text: string }> => {
  const proxies: Array<{ name: string; build: (u: string) => string; isProxy: boolean }> = [
    { name: 'direct', build: (u) => u, isProxy: false },
    { name: 'allorigins', build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, isProxy: true },
    { name: 'thingproxy', build: (u) => `https://thingproxy.freeboard.io/fetch/${u}`, isProxy: true },
    { name: 'codetabs', build: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`, isProxy: true },
  ];

  const attempts = proxies.map(async ({ name, build, isProxy }) => {
    const target = build(url);
    const res = await fetchWithTimeout(target, { cache: 'no-store', referrerPolicy: 'no-referrer' }, timeout);
    const text = await res.text();
    // For proxies: any non-2xx status (or pricing/limit text) means the proxy itself failed — try another
    if (isProxy) {
      if (!res.ok) throw new Error(`Proxy ${name} status ${res.status}`);
      if (/corsproxy\.io\/pricing|Free usage is limited|rate limit/i.test(text)) {
        throw new Error(`Proxy ${name} blocked`);
      }
    }
    return { ok: res.ok, status: res.status, text };
  });

  try {
    return await Promise.any(attempts);
  } catch (e: any) {
    throw new Error("Failed to connect to server (CORS / network)");
  }
};

const jsonCache = new Map<string, { time: number; data: any }>();
const inFlightJsonRequests = new Map<string, Promise<any>>();

const parseJsonResponse = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || /<html|<!doctype html/i.test(trimmed)) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const fetchJsonWithCorsFallback = async (url: string, timeout = 4500): Promise<any> => {
  const cached = jsonCache.get(url);
  if (cached && Date.now() - cached.time < 10000) return cached.data;

  const existing = inFlightJsonRequests.get(url);
  if (existing) return existing;

  const proxies: Array<{ name: string; build: (u: string) => string; isProxy: boolean }> = [
    { name: 'direct', build: (u) => u, isProxy: false },
    { name: 'allorigins', build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, isProxy: true },
    { name: 'codetabs', build: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`, isProxy: true },
    { name: 'thingproxy', build: (u) => `https://thingproxy.freeboard.io/fetch/${u}`, isProxy: true },
  ];

  const request = Promise.any(
    proxies.map(async ({ name, build, isProxy }) => {
      const targetUrl = build(url);
      const separator = targetUrl.includes('?') ? '&' : '?';
      const res = await fetchWithTimeout(`${targetUrl}${separator}_t=${Date.now()}`, {
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      }, timeout);
      const text = await res.text();
      if (!res.ok) throw new Error(`${name} status ${res.status}`);
      if (isProxy && /corsproxy\.io\/pricing|Free usage is limited|rate limit|access denied/i.test(text)) {
        throw new Error(`${name} blocked`);
      }
      const json = parseJsonResponse(text);
      if (!json || typeof json !== 'object') throw new Error(`${name} invalid JSON`);
      return json;
    })
  ).then((data) => {
    jsonCache.set(url, { time: Date.now(), data });
    return data;
  }).catch(() => null).finally(() => {
    inFlightJsonRequests.delete(url);
  });

  inFlightJsonRequests.set(url, request);
  return request;
};

export const launchInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    let url = apiUrlPattern.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    url = url.replace(/{target_uid}/g, targetUid);
    try { new URL(url); } catch (_) { throw new Error("Invalid API URL Configuration"); }

    console.log(`[Launch API] Requesting: ${url}`);
    const { ok, status, text } = await fetchWithCorsFallback(url, 10000);
    console.log(`[Launch API] Status: ${status}, Response: ${text}`);

    if (!ok) throw new Error(`API Error: ${status} - ${text}`);
    return text || "Instance launched successfully";
  } catch (error: any) {
    console.error("[Launch API] Failed:", error);
    throw new Error(error.message || "Failed to connect to server");
  }
};

export const deleteInstanceApi = async (targetUid: string, apiUrlPattern: string): Promise<string> => {
  try {
    let url = apiUrlPattern.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    url = url.replace(/{target_uid}/g, targetUid);
    try { new URL(url); } catch (_) { throw new Error("Invalid API URL Configuration"); }

    console.log(`[Delete API] Requesting: ${url}`);
    const { ok, status, text } = await fetchWithCorsFallback(url, 10000);
    console.log(`[Delete API] Status: ${status}, Response: ${text}`);

    if (!ok) throw new Error(`API Error: ${status} - ${text}`);
    return text || "Instance removed successfully";
  } catch (error: any) {
    console.error("[Delete API] Failed:", error);
    throw new Error(error.message || "Failed to connect to server");
  }
};

// --- Profile / Banner Fetching Logic ---

export const fetchProfileData = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  // Construct the URL by replacing placeholder
  const baseUrl = apiUrlPattern || "https://mehedi-x-banner.vercel.app/profile?uid={uid}";
  const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);
  
  // OPTIMIZATION 1: Instant Extension Check
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
      return { Banner: url, Avatar: "", Nickname: "" };
  }

  // Helper to add cache buster
  const getCacheBustedUrl = (u: string) => {
      const sep = u.includes('?') ? '&' : '?';
      return `${u}${sep}_t=${Date.now()}`;
  };

  const proxies = [
      (u: string) => u, // Direct

      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  for (const proxy of proxies) {
      try {
          const fetchUrl = getCacheBustedUrl(proxy(url));
          const response = await fetchWithTimeout(fetchUrl, { cache: 'no-store' }, 5000);
          
          if (response.ok) {
              const text = await response.text();
              try {
                  const json = JSON.parse(text);
                  if (json && typeof json === 'object') {
                      const banner = findValueRecursive(json, /.*(banner|background|cover|wall|header).*/i, true);
                      const avatar = findValueRecursive(json, /.*(avatar|icon|image|pic|photo|profile).*/i, true);
                      const nickname = findValueRecursive(json, /^(nickname|name|user_name|username|ign|player_name)$/i, false);

                      if (banner || avatar || nickname) {
                          return {
                              Banner: banner || "",
                              Avatar: avatar || "",
                              Nickname: nickname || ""
                          };
                      }
                  }
              } catch (e) {
                  // Parsing failed, it might be a plain text URL
                  if (text.trim().startsWith("http")) {
                       return { Banner: text.trim(), Avatar: "", Nickname: "" };
                  }
              }
          }
      } catch (e) {
          continue;
      }
  }

  // FALLBACK: Force use of the constructed URL if all else fails
  return { Banner: url, Avatar: "", Nickname: "" };
};

export const fetchLevelInfo = async (uid: string, apiUrlPattern?: string): Promise<any> => {
  const baseUrl = apiUrlPattern || "https://mehedixlevel-info-nxt.vercel.app/level/{uid}";
  const url = baseUrl.replace(/{uid}/g, uid).replace(/{target_uid}/g, uid);

  return fetchJsonWithCorsFallback(url, 4500);
};