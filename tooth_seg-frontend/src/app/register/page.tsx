"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "../login/login.module.css";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mismatch = useMemo(() => {
    if (!password || !confirm) return false;
    return password !== confirm;
  }, [password, confirm]);

  const fullNameInvalid = useMemo(() => fullName.trim().length === 0, [fullName]);
  const emailInvalid = useMemo(() => email.trim().length === 0, [email]);
  const passwordTooShort = useMemo(() => password.length > 0 && password.length < 6, [password]);

  const disableSubmit =
    loading || fullNameInvalid || emailInvalid || mismatch || passwordTooShort;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (fullName.trim().length === 0) {
      setErr("Full name is required.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.register(fullName.trim(), email.trim(), password, confirm);
      router.push("/login"); // ✅ register success -> go to login only
    } catch (ex: any) {
      setErr(ex.message || "Register failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.left}>
          <div className={styles.decor1} />
          <div className={styles.decor2} />
          <div className={styles.decor3} />

          <div className={styles.leftInner}>
            <div className={styles.brand}>
              <div className={styles.kicker}>Clinical AI • Web App</div>
              <h1 className={styles.leftTitle}>Tooth Segmentation</h1>
              <p className={styles.leftDesc}>
                Create your account to save prediction history and export results anytime.
              </p>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Secure access</p>
                <p className={styles.featureText}>Your cases are organized under your account.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>History per user</p>
                <p className={styles.featureText}>Keep predictions and exports easy to revisit.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>One-click export</p>
                <p className={styles.featureText}>Export overlay PNG and JSON for reporting.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Ready for clinic flow</p>
                <p className={styles.featureText}>Designed to scale into real-world usage.</p>
              </div>
            </div>

            <div className={styles.badges}>
              <span className={styles.badge}>Secure access</span>
              <span className={styles.badge}>User history</span>
              <span className={styles.badge}>Export results</span>
            </div>
          </div>
        </section>

        <section className={styles.right}>
          <div className={styles.card}>
            <h2 className={styles.formTitle}>Create account</h2>
            <p className={styles.formSub}>Register, then sign in on the login page.</p>

            <form className={styles.form} onSubmit={onSubmit}>
              <label className={styles.label}>
                Full name
                <input
                  className={styles.input}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="John Doe"
                  required
                />
              </label>

              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className={styles.label}>
                Password
                <input
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  style={
                    passwordTooShort
                      ? {
                          borderColor: "rgba(229,57,53,0.55)",
                          boxShadow: "0 0 0 4px rgba(229,57,53,0.10)",
                        }
                      : undefined
                  }
                />
              </label>

              <label className={styles.label}>
                Confirm password
                <input
                  className={styles.input}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  style={
                    mismatch
                      ? {
                          borderColor: "rgba(229,57,53,0.55)",
                          boxShadow: "0 0 0 4px rgba(229,57,53,0.10)",
                        }
                      : undefined
                  }
                />
              </label>

              <button className={styles.primary} type="submit" disabled={disableSubmit}>
                {loading ? "Please wait..." : "Create account"}
              </button>

              <button
                className={styles.secondary}
                type="button"
                onClick={() => router.push("/login")}
              >
                Back to login
              </button>

              {err && (
                <div className={styles.err}>
                  <b>Error:</b> {err}
                </div>
              )}
            </form>

            <div className={styles.hint}>
              Backend API: <code>{process.env.NEXT_PUBLIC_API_BASE}</code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}