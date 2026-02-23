"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import styles from "./login.module.css";
import StudentIDCard from "./StudentIDCard";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || leaving) return;

    const e1 = email.trim();
    const p1 = password;

    // toast validation
    if (!e1 && !p1) return void setErr("Please fill in your email and password.");
    if (!e1) return void setErr("Please enter your email.");
    if (!p1) return void setErr("Please enter your password.");

    setErr(null);
    setLoading(true);

    try {
      const r = await api.login(e1, p1);
      auth.set(r.accessToken);

      // ✅ play exit animation ONLY when login success
      setLeaving(true);

      // must match CSS duration (e.g., 620ms)
      window.setTimeout(() => {
        sessionStorage.setItem("after_login_shell_intro", "1");
        router.push("/home");
      }, 620);
    } catch (ex: any) {
      setErr(ex?.message || "Login failed: Invalid email or password.");
      setLoading(false);
    }
  }

  return (
    <div className={`${styles.page} ${leaving ? styles.pageLeaving : ""}`}>
      <div className={styles.shell}>
        {/* LEFT */}
        <section className={`${styles.left} ${leaving ? styles.leftExit : ""}`}>
          <img
            src="/assets/Collab2.png"
            alt="Dentistry logo"
            className={styles.leftTopLogo}
          />

          <div className={styles.decor1} />
          <div className={styles.decor2} />
          <div className={styles.decor3} />

          <div className={styles.leftInner}>
            <div className={styles.brand}>
              <div className={styles.kicker}>Clinical AI • Web App</div>
              <h1 className={styles.leftTitle}>Tooth Segmentation</h1>
              <p className={styles.leftDesc}>
                Upload a panoramic X-ray to run instance segmentation + FDI numbering.
                Review overlays and a structured table (FDI, confidence, area, position),
                then export PNG + JSON for reporting.
              </p>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Clear overlays</p>
                <p className={styles.featureText}>
                  Masks + contours with readable FDI labels.
                </p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Structured output</p>
                <p className={styles.featureText}>
                  FDI, score, area, and centroid for each tooth instance.
                </p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Export-ready</p>
                <p className={styles.featureText}>
                  Download PNG overlay and JSON for audit or reports.
                </p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>History per user</p>
                <p className={styles.featureText}>
                  Keep cases organized under your account.
                </p>
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

        {/* RIGHT */}
        <section className={`${styles.right} ${leaving ? styles.rightExit : ""}`}>
          <div className={styles.rightStack}>
            <img
              src="/assets/VLU_logo_text.png"
              alt="Van Lang University Dentistry"
              className={`${styles.rightTopLogo} ${leaving ? styles.rightLogoExit : ""}`}
            />

            {/* ✅ IMPORTANT: use the same fixed frame as Register (same width/height/radius) */}
            <div className={`${styles.cardFrame} ${leaving ? styles.cardExit : ""}`}>
              <StudentIDCard
                email={email}
                password={password}
                loading={loading || leaving}
                err={err}
                apiBase={process.env.NEXT_PUBLIC_API_BASE}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={onSubmit}
                onForgot={() => router.push("/forgot-password")}
                onRegister={() => router.push("/register")}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}