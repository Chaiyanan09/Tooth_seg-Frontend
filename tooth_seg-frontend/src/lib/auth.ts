const KEY = "tooth_token";

export const auth = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEY);
  },
  set(token: string) {
    localStorage.setItem(KEY, token);
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};