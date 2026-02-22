"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import styles from "./login.module.css";
import StudentIDCard from "./StudentIDCard";
import AuthFlipCard from "../register/AuthFlipCard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();

  const e1 = email.trim();
  const p1 = password;

  // ✅ กรอกไม่ครบ -> toast ทันที (แทนที่ toast เดิม)
  if (!e1 && !p1) {
    setErr("Please fill in your email and password.");
    return;
  }
  if (!e1) {
    setErr("Please enter your email.");
    return;
  }
  if (!p1) {
    setErr("Please enter your password.");
    return;
  }

  setErr(null);
  setLoading(true);
  try {
    const r = await api.login(e1, p1);
    auth.set(r.accessToken);
    router.push("/home");
  } catch (ex: any) {
    setErr(ex.message || "Login failed: Invalid email or password.");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.left}>
          {/* ✅ TOP-LEFT DENTISTRY LOGO (layer above bg) */}
          <img
            src="/assets/Collab2.png"
            className={styles.leftTopLogo}
          />

          {/* keep your existing decor circles */}
          <div className={styles.decor1} />
          <div className={styles.decor2} />
          <div className={styles.decor3} />

          <div className={styles.leftInner}>
            <div className={styles.brand}>
              <div className={styles.kicker}>Clinical AI • Web App</div>
              <h1 className={styles.leftTitle}>Tooth Segmentation</h1>
              <p className={styles.leftDesc}>
                Upload a panoramic X-ray to run instance segmentation + FDI
                numbering. Review overlays and a structured table (FDI,
                confidence, area, position), then export PNG + JSON for reporting.
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

        {/* RIGHT: Student ID card */}
        <section className={styles.right}>
          <div className={styles.rightStack}>
            <img src="/assets/VLU_logo_text.png" alt="..." className={styles.rightTopLogo} />

            <AuthFlipCard
              flipped={false}
              autoFlip={false}
              front={
                <StudentIDCard
                  email={email}
                  password={password}
                  loading={loading}
                  err={err}
                  apiBase={process.env.NEXT_PUBLIC_API_BASE}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSubmit={onSubmit}
                  onForgot={() => router.push("/forgot-password")}
                  onRegister={() => router.push("/register")}
                />
              }
              back={<div />} // ไม่ใช้
            />
          </div>
        </section>
      </div>
    </div>
  );
}