"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import styles from "../forgot-password/forgot.module.css";

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const mismatch = useMemo(() => pw.length > 0 && cf.length > 0 && pw !== cf, [pw, cf]);
  const pwTooShort = useMemo(() => pw.length > 0 && pw.length < 6, [pw]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!token) {
      setMsg("Missing token. Please request a new reset link.");
      return;
    }
    if (!pw || !cf) {
      setMsg("Please fill in both password fields.");
      return;
    }
    if (pw.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    if (pw !== cf) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, pw, cf);
      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => router.push("/login"), 700);
    } catch (ex: any) {
      setMsg(ex?.message || "Reset failed. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <h2 className={styles.title}>Reset password</h2>
          <p className={styles.sub}>Enter your new password below.</p>

          {!token && (
            <div className={styles.err}>
              <b>Error:</b> Missing token. Please request a new reset link.
            </div>
          )}

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              New password
              <input
                className={styles.input}
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                style={
                  pwTooShort
                    ? { borderColor: "rgba(229,57,53,.35)", boxShadow: "0 0 0 4px rgba(229,57,53,.06)" }
                    : undefined
                }
              />
              {pwTooShort && (
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(229,57,53,.85)" }}>
                  Password must be at least 6 characters.
                </div>
              )}
            </label>

            <label className={styles.label}>
              Confirm new password
              <input
                className={styles.input}
                type="password"
                value={cf}
                onChange={(e) => setCf(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                style={
                  mismatch
                    ? { borderColor: "rgba(229,57,53,.55)", boxShadow: "0 0 0 4px rgba(229,57,53,.10)" }
                    : undefined
                }
              />
              {mismatch && (
                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(229,57,53,.85)" }}>
                  Passwords do not match.
                </div>
              )}
            </label>

            <div className={styles.row}>
              {/* ✅ ไม่ disable ด้วย canSubmit แล้ว กดได้เสมอ (ยกเว้นกำลังโหลด) */}
              <button className={styles.primary} type="submit" disabled={loading}>
                {loading ? "Please wait…" : "Update password"}
              </button>

              <button
                className={styles.secondary}
                type="button"
                onClick={() => router.push("/login")}
                disabled={loading}
              >
                Back to login
              </button>
            </div>

            {msg && (
              <div className={styles.err}>
                <b>Info:</b> {msg}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}