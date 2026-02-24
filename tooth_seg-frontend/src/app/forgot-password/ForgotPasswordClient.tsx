// src/app/forgot-password/ForgotPasswordClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./forgot.module.css";

type Props = {
  initialEmail?: string;
};

const EXIT_MS = 320;

export default function ForgotPasswordClient({ initialEmail = "" }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // exit animation state
  const [isExiting, setIsExiting] = useState(false);

  // lock scroll
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

  function goLogin() {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      router.push("/login");
    }, EXIT_MS);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (isExiting) return;

    setErr(null);
    setMsg(null);

    const em = email.trim();
    if (!em) return setErr("Email is required.");

    setLoading(true);
    try {
      const r = await api.forgotPassword(em);
      setMsg(
        r.message || "If the account exists, a reset link will be sent to your email."
      );
    } catch (ex: any) {
      setErr(ex.message || "Request failed");
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
            <span className={styles.tabText}>RESET REQUEST</span>
          </div>

          {/* file card */}
          <div className={styles.fileCard}>
            {/* content */}
            <div className={styles.body}>
              {/* spine */}
              <aside className={styles.spine} aria-hidden="true">
                <div className={styles.spineInner}>
                  <div className={styles.barcode} />
                </div>
              </aside>

              <header className={styles.header}>
                <div className={styles.appPill}>ToothInSeg • Dental X-ray AI</div>
                <div className={styles.headerMeta}>
                  <div className={styles.metaTitle}>Password Reset Form</div>
                  <div className={styles.metaSub}>
                    Submit your email to receive a secure reset link.
                  </div>
                </div>
              </header>

              <div className={styles.content}>
                <h1 className={styles.title}>Forgot password</h1>
                <p className={styles.sub}>
                  Enter your email and we’ll send you a password reset link.
                </p>

                <form className={styles.form} onSubmit={send}>
                  <div className={styles.formSection}>
                    <div className={styles.sectionTitle}>Applicant information</div>
                    <label className={styles.label}>
                      Email address
                      <input
                        className={styles.input}
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        inputMode="email"
                        disabled={loading || isExiting}
                      />
                    </label>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.primary}
                      type="submit"
                      disabled={loading || isExiting || !email.trim()}
                    >
                      {loading ? "Sending..." : "Send reset link"}
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

                  {msg && (
                    <div className={styles.msg} role="status" aria-live="polite">
                      {msg}
                    </div>
                  )}

                  {err && (
                    <div className={styles.err} role="alert">
                      <b>Error:</b> {err}
                    </div>
                  )}
                </form>

                <div className={styles.hint}>
                  Tip: Check inbox/spam. Link expires in 15 minutes.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}