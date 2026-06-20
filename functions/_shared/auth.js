const COOKIE_NAME = "macau_auth";
const DEFAULT_SESSION_DAYS = 30;
const textEncoder = new TextEncoder();

export async function isAuthenticated(request, env) {
  if (!isAuthConfigured(env)) {
    return false;
  }

  const token = getCookie(request, COOKIE_NAME);
  if (!token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [expiresAt, passwordFingerprint, signature] = parts;
  if (!/^\d+$/.test(expiresAt) || !/^[a-f0-9]{16}$/i.test(passwordFingerprint) || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const currentFingerprint = await getPasswordFingerprint(env);
  if (!constantTimeEqual(passwordFingerprint, currentFingerprint)) {
    return false;
  }

  const expectedSignature = await hmacHex(env.AUTH_SECRET, `${expiresAt}.${passwordFingerprint}`);
  return constantTimeEqual(signature, expectedSignature);
}

export async function createSessionCookie(env) {
  assertConfigured(env);

  const maxAgeDays = Number(env.AUTH_MAX_AGE_DAYS || DEFAULT_SESSION_DAYS);
  const maxAgeSeconds = Math.max(1, Math.round(maxAgeDays * 24 * 60 * 60));
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const passwordFingerprint = await getPasswordFingerprint(env);
  const signature = await hmacHex(env.AUTH_SECRET, `${expiresAt}.${passwordFingerprint}`);
  const token = `${expiresAt}.${passwordFingerprint}.${signature}`;

  return serializeCookie(COOKIE_NAME, token, maxAgeSeconds);
}

export function createLogoutCookie() {
  return serializeCookie(COOKIE_NAME, "", 0);
}

export async function verifyPassword(password, env) {
  assertConfigured(env);
  const providedHash = await sha256Hex(String(password ?? ""));
  const expectedHash = await sha256Hex(String(env.SITE_PASSWORD));
  return constantTimeEqual(providedHash, expectedHash);
}

export function isPublicPath(pathname) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/styles.css" ||
    pathname === "/favicon.ico"
  );
}

export function buildLoginUrl(request) {
  const url = new URL(request.url);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const loginUrl = new URL("/login/", url.origin);
  if (next && next !== "/login/" && next !== "/login") {
    loginUrl.searchParams.set("next", next);
  }
  return loginUrl;
}

export function isAuthConfigured(env) {
  return Boolean(String(env?.SITE_PASSWORD || "").trim()) && Boolean(String(env?.AUTH_SECRET || "").trim());
}

export function createUnauthorizedApiResponse(message = "未登录或登录已过期。") {
  return json({ error: message }, 401);
}

export function createConfigErrorResponse() {
  return new Response("请先在 Cloudflare Pages 环境变量中配置 SITE_PASSWORD 和 AUTH_SECRET。", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function assertConfigured(env) {
  if (!isAuthConfigured(env)) {
    const error = new Error("请先配置 SITE_PASSWORD 和 AUTH_SECRET。");
    error.status = 503;
    throw error;
  }
}

async function getPasswordFingerprint(env) {
  const hash = await sha256Hex(String(env.SITE_PASSWORD));
  return hash.slice(0, 16);
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  const a = String(left);
  const b = String(right);
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(/;\s*/);
  for (const item of cookies) {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = item.slice(0, separatorIndex).trim();
    if (key !== name) continue;

    return decodeURIComponent(item.slice(separatorIndex + 1));
  }
  return "";
}

function serializeCookie(name, value, maxAgeSeconds) {
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];

  return segments.join("; ");
}
