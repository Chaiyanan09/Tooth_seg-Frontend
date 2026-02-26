import { auth } from "./auth";

function normalizeBase(raw?: string) {
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE is not set. Set it in Vercel/your .env.local, e.g. https://<backend>.up.railway.app"
    );
  }

  let b = raw.trim().replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(b)) {
    const isLocal =
      /^localhost(:\d+)?$/i.test(b) || /^127\.0\.0\.1(:\d+)?$/i.test(b);
    b = (isLocal ? "http://" : "https://") + b;
  }

  return b;
}

const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.get();
  const headers = new Headers(init.headers);

  const hasBody = init.body !== undefined && init.body !== null;
  const isForm = init.body instanceof FormData;

  // IMPORTANT: if FormData, NEVER set Content-Type manually
  if (isForm) {
    headers.delete("Content-Type");
    headers.delete("content-type");
  } else if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const raw = await res.text();

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;

    try {
      const data = raw ? JSON.parse(raw) : null;
      msg = data?.message || data?.error || msg;

      // FastAPI style: {"detail": ...}
      if (data?.detail) {
        if (typeof data.detail === "string") msg = data.detail;
        else if (Array.isArray(data.detail)) {
          msg = data.detail?.[0]?.msg || JSON.stringify(data.detail);
        } else {
          msg = JSON.stringify(data.detail);
        }
      }
    } catch {
      if (raw) msg = raw;
    }

    throw new Error(msg);
  }

  if (!raw || res.status === 204 || res.status === 205) return undefined as T;

  const ct = res.headers.get("content-type") || "";
  const looksJson = raw.trim().startsWith("{") || raw.trim().startsWith("[");

  if (ct.includes("application/json") || looksJson) {
    return JSON.parse(raw) as T;
  }
  return raw as unknown as T;
}

// -------- Types --------
export type PredictResponse = {
  // Mongo history
  id?: string;
  createdAt?: string;
  userId?: string;
  modelName?: string;

  // path ของไฟล์ (กรณีเลือก folder)
  path?: string;

  // ML result
  inferenceMs?: number;
  inference_ms?: number;
  instances?: any[];

  // Overlay แบบเดิม (ตอนนี้)
  overlayPngBase64?: string;
  overlay_png_base64?: string;

  // ✅ เผื่ออนาคต: Cloudinary private (signed urls จาก BE เท่านั้น)
  inputUrl?: string;
  overlayUrl?: string;

  // ✅ เผื่ออนาคต: เก็บ raw json จาก ML (ไว้ download .json)
  mlRawJson?: string;
};

export type PredictManyResult =
  | { ok: true; file: File; data: PredictResponse; path?: string }
  | { ok: false; file: File; error: string; path?: string };

// -------- API internals --------
const predictOne = (file: File, path?: string) => {
  const fd = new FormData();
  fd.append("file", file); // key must be "file"
  if (path) fd.append("path", path); // ✅ ให้ BE เก็บ folder structure ตาม userId ได้
  return request<PredictResponse>("/api/predict", { method: "POST", body: fd });
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  };

  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

type GetPathFn = (f: File) => string;

// overloads (TypeScript)
export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ) =>
    request<void>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, confirmPassword }),
    }),

  me: () =>
    request<{ fullName: string; email: string }>("/api/me", { method: "GET" }),

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

  // ✅ Predict 1 รูป: ใช้ได้ทั้ง predict(file) และ predict(file, path)
  predict: (file: File, path?: string) => predictOne(file, path),

  /**
   * ✅ Predict หลายรูป
   * ใช้ได้ 2 แบบ:
   * 1) predictMany(files, 2)
   * 2) predictMany(files, (f)=>f.webkitRelativePath||f.name, 2)
   */
  predictMany: async (
    files: File[],
    arg1?: number | GetPathFn,
    arg2?: number
  ): Promise<PredictManyResult[]> => {
    const getPath: GetPathFn | undefined =
      typeof arg1 === "function" ? arg1 : undefined;

    const concurrency =
      typeof arg1 === "number" ? arg1 : (typeof arg2 === "number" ? arg2 : 2);

    return mapWithConcurrency(files, concurrency, async (f) => {
      const p = getPath ? getPath(f) : undefined;
      try {
        const data = await predictOne(f, p);
        return { ok: true as const, file: f, data, path: p };
      } catch (e: any) {
        return { ok: false as const, file: f, error: e?.message ?? "Predict failed", path: p };
      }
    });
  },

  history: () => request<PredictResponse[]>("/api/history", { method: "GET" }),

  historyOne: (id: string) =>
    request<PredictResponse>(`/api/history/${id}`, { method: "GET" }),
};