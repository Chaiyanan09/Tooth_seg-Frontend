"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import styles from "../forgot-password/forgot.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Lock scroll (เหมือน forgot password)
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const mismatch = useMemo(() => p1.length > 0 && p2.length > 0 && p1 !== p2, [p1, p2]);
  const tooShort = useMemo(() => p1.length > 0 && p1.length < 6, [p1]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!token) {
      setErr("Missing token. Please request a new reset link.");
      return;
    }
    if (p1.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (p1 !== p2) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const r = await api.resetPassword(token, p1, p2);
      setMsg(r.message || "Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 900);
    } catch (ex: any) {
      setErr(ex.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.decor1} />
      <div className={styles.decor2} />
      <div className={styles.decor3} />

      <div className={styles.card}>
        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.sub}>
          Enter your new password below. The link expires after a short time.
        </p>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label}>
            New password
            <input
              className={styles.input}
              type="password"
              value={p1}
              onChange={(ev) => setP1(ev.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              style={
                tooShort
                  ? { borderColor: "rgba(229,57,53,0.55)", boxShadow: "0 0 0 4px rgba(229,57,53,0.10)" }
                  : undefined
              }
            />
          </label>

          <label className={styles.label}>
            Confirm new password
            <input
              className={styles.input}
              type="password"
              value={p2}
              onChange={(ev) => setP2(ev.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              style={
                mismatch
                  ? { borderColor: "rgba(229,57,53,0.55)", boxShadow: "0 0 0 4px rgba(229,57,53,0.10)" }
                  : undefined
              }
            />
          </label>

          <div className={styles.row}>
            <button
              className={styles.primary}
              type="submit"
              disabled={loading || !token || mismatch || tooShort}
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <button
              className={styles.secondary}
              type="button"
              onClick={() => router.push("/login")}
            >
              Back to login
            </button>
          </div>

          {msg && <div className={styles.msg}>{msg}</div>}
          {err && (
            <div className={styles.err}>
              <b>Error:</b> {err}
            </div>
          )}
        </form>

        {!token && (
          <div className={styles.hint}>
            No token found. Go to <b>Forgot password</b> and request a new link.
          </div>
        )}
      </div>
    </div>
  );
}