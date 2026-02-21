"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await api.login(email.trim(), password);
      auth.set(r.accessToken);
      router.push("/home");
    } catch (ex: any) {
      setErr(ex.message || "Login failed");
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
                Upload a panoramic X-ray to run instance segmentation + FDI numbering.
                Review overlays and a structured table (FDI, confidence, area, position), then export PNG + JSON for reporting.
              </p>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Clear overlays</p>
                <p className={styles.featureText}>Masks + contours with readable FDI labels.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Structured output</p>
                <p className={styles.featureText}>FDI, score, area, and centroid for each tooth instance.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Export-ready</p>
                <p className={styles.featureText}>Download PNG overlay and JSON for audit or reports.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>History per user</p>
                <p className={styles.featureText}>Keep cases organized under your account.</p>
              </div>
            </div>

            <div className={styles.badges}>
              <span className={styles.badge}>Overlay + contour</span>
              <span className={styles.badge}>FDI numbering</span>
              <span className={styles.badge}>User history</span>
              <span className={styles.badge}>PNG + JSON export</span>
            </div>
          </div>
        </section>

        <section className={styles.right}>
          <div className={styles.card}>
            <h2 className={styles.formTitle}>Login</h2>
            <p className={styles.formSub}>Sign in to access predictions and your history.</p>

            <form className={styles.form} onSubmit={onSubmit}>
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
                  autoComplete="current-password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </label>

              <button className={styles.primary} type="submit" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </button>

              <button
                className={styles.secondary}
                type="button"
                onClick={() => router.push("/register")}
              >
                Create an account
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