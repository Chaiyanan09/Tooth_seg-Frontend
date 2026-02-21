import { auth } from "./auth";

const base = process.env.NEXT_PUBLIC_API_BASE!;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.get();
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.message || data?.error || msg;
    } catch {
      const text = await res.text();
      if (text) msg = text;
    }
    throw new Error(msg);
  }

  // ✅ handle empty response body (register usually returns 200/204 with no JSON)
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text) return undefined as T;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return JSON.parse(text) as T;

  // fallback (rare)
  return text as unknown as T;
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

  me: () =>
    request<{ fullName: string; email: string }>("/api/me", {
        method: "GET",
    }),
};