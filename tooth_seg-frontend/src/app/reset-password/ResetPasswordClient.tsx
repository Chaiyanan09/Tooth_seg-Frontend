// src/app/reset-password/ResetPasswordClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import styles from "../forgot-password/forgot.module.css";

const EXIT_MS = 320;

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [loading, setLoading] = useState(false);

  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [isExiting, setIsExiting] = useState(false);

  // lock scroll (ให้ฟีลเหมือน forgot)
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

  const mismatch = useMemo(
    () => pw.length > 0 && cf.length > 0 && pw !== cf,
    [pw, cf]
  );
  const pwTooShort = useMemo(() => pw.length > 0 && pw.length < 6, [pw]);

  function goLogin() {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => router.push("/login"), EXIT_MS);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isExiting) return;

    setErr(null);
    setInfo(null);

    if (!token) {
      setErr("Missing token. Please request a new reset link.");
      return;
    }
    if (!pw || !cf) {
      setErr("Please fill in both password fields.");
      return;
    }
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (pw !== cf) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, pw, cf);
      setInfo("Password updated. Redirecting to login…");

      // ✅ เล่น animation ออกก่อนค่อย redirect
      setIsExiting(true);
      window.setTimeout(() => router.push("/login"), EXIT_MS + 380);
    } catch (ex: any) {
      setErr(ex?.message || "Reset failed. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.page} ${isExiting ? styles.pageExit : ""}`}>
      {/* background blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      <main className={styles.stage}>
        <section className={`${styles.file} ${isExiting ? styles.exit : ""}`}>
          {/* folder tab */}
          <div className={styles.tab} aria-hidden="true">
            <span className={styles.tabText}>RESET PASSWORD</span>
          </div>

          <div className={styles.fileCard}>
            <div className={styles.body}>
              {/* spine */}
              <aside className={styles.spine} aria-hidden="true">
                <div className={styles.spineInner}>
                  <div className={styles.barcode} />
                </div>
              </aside>

              {/* header */}
              <header className={styles.header}>
                <div className={styles.appPill}>ToothInSeg • Dental X-ray AI</div>
                <div className={styles.headerMeta}>
                  <div className={styles.metaTitle}>New Password Form</div>
                  <div className={styles.metaSub}>
                    Create a new password to regain access to your account.
                  </div>
                </div>
              </header>

              {/* content */}
              <div className={styles.content}>
                <h1 className={styles.title}>Reset password</h1>
                <p className={styles.sub}>Enter your new password below.</p>

                {/* token missing */}
                {!token && (
                  <div className={styles.err} role="alert">
                    <b>Error:</b> Missing token. Please request a new reset link.
                  </div>
                )}

                <form className={styles.form} onSubmit={onSubmit}>
                  <div className={styles.formSection}>
                    <div className={styles.sectionTitle}>New credentials</div>

                    <label className={styles.label}>
                      New password
                      <input
                        className={styles.input}
                        type="password"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        disabled={loading || isExiting}
                        style={
                          pwTooShort
                            ? {
                                borderColor: "rgba(229,57,53,.35)",
                                boxShadow: "0 0 0 4px rgba(229,57,53,.06)",
                              }
                            : undefined
                        }
                      />
                      {pwTooShort && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "rgba(229,57,53,.85)",
                          }}
                        >
                          Password must be at least 6 characters.
                        </div>
                      )}
                    </label>

                    <label className={styles.label} style={{ marginTop: 10 }}>
                      Confirm new password
                      <input
                        className={styles.input}
                        type="password"
                        value={cf}
                        onChange={(e) => setCf(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        disabled={loading || isExiting}
                        style={
                          mismatch
                            ? {
                                borderColor: "rgba(229,57,53,.55)",
                                boxShadow: "0 0 0 4px rgba(229,57,53,.10)",
                              }
                            : undefined
                        }
                      />
                      {mismatch && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "rgba(229,57,53,.85)",
                          }}
                        >
                          Passwords do not match.
                        </div>
                      )}
                    </label>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.primary}
                      type="submit"
                      disabled={loading || isExiting || !token}
                    >
                      {loading ? "Please wait…" : "Update password"}
                    </button>

                    <button
                      className={styles.secondary}
                      type="button"
                      onClick={goLogin}
                      disabled={loading || isExiting}
                    >
                      Back to login
                    </button>
                  </div>

                  {info && (
                    <div className={styles.msg} role="status" aria-live="polite">
                      {info}
                    </div>
                  )}

                  {err && (
                    <div className={styles.err} role="alert">
                      <b>Error:</b> {err}
                    </div>
                  )}
                </form>

                <div className={styles.hint}>
                  Tip: If the link is expired, request a new reset link from “Forgot password”.
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footerNote}>
            Secure workflow • Single-use token • Expiration enforced
          </div>
        </section>
      </main>
    </div>
  );
}