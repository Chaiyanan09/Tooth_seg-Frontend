import { auth } from "./auth";

function normalizeBase(raw?: string) {
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE is not set. Set it in Vercel/your .env.local, e.g. https://<backend>.up.railway.app"
    );
  }

  let b = raw.trim().replace(/\/+$/, ""); // remove trailing slashes

  // If missing protocol, add one (local -> http, others -> https)
  if (!/^https?:\/\//i.test(b)) {
    const isLocal = /^localhost(:\d+)?$/i.test(b) || /^127\.0\.0\.1(:\d+)?$/i.test(b);
    b = (isLocal ? "http://" : "https://") + b;
  }

  return b;
}

const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.get();
  const headers = new Headers(init.headers);

  // Set content-type only when we actually send JSON
  const hasBody = init.body !== undefined && init.body !== null;
  const isForm = init.body instanceof FormData;

  if (hasBody && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${base}${path}`, { ...init, headers });

  // ✅ read body ONCE
  const raw = await res.text();

  // error
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;

    // try JSON error
    try {
      const data = raw ? JSON.parse(raw) : null;
      msg = data?.message || data?.error || msg;
    } catch {
      // fallback text
      if (raw) msg = raw;
    }

    throw new Error(msg);
  }

  // ok but empty body (common for 200/204)
  if (!raw || res.status === 204 || res.status === 205) return undefined as T;

  const ct = res.headers.get("content-type") || "";
  const looksJson = raw.trim().startsWith("{") || raw.trim().startsWith("[");

  if (ct.includes("application/json") || looksJson) {
    return JSON.parse(raw) as T;
  }

  return raw as unknown as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (fullName: string, email: string, password: string, confirmPassword: string) =>
    request<void>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, confirmPassword }),
    }),

  me: () => request<{ fullName: string; email: string }>("/api/me", { method: "GET" }),

  updateMe: (fullName: string) =>
    request<{ fullName: string; email: string }>("/api/me", {
      method: "PUT",
      body: JSON.stringify({ fullName }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    }),
};