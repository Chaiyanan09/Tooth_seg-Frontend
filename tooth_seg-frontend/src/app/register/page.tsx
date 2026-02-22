"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "../login/login.module.css";
import StudentIDCard from "../login/StudentIDCard";
import AuthFlipCard from "./AuthFlipCard";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  // ✅ คุม flip เพื่อให้ “กลับหน้า login แล้ว flip กลับ” ได้
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setFlipped(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const mismatch = useMemo(() => {
    if (!password || !confirm) return false;
    return password !== confirm;
  }, [password, confirm]);

  const fullNameInvalid = useMemo(() => fullName.trim().length === 0, [fullName]);
  const emailInvalid = useMemo(() => email.trim().length === 0, [email]);
  const passwordTooShort = useMemo(
    () => password.length > 0 && password.length < 6,
    [password]
  );

  function goLoginWithFlipBack() {
    setPendingNav("/login");
    setFlipped(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ✅ clear toast แล้ว set ใหม่ทันที (แทนที่ของเก่า)
    setErr(null);

    const name = fullName.trim();
    const mail = email.trim();
    const p1 = password;
    const p2 = confirm;

    // -------- client validation -> toast --------
    if (!name && !mail && !p1 && !p2) {
      setErr("Please fill in all fields to create an account.");
      return;
    }
    if (!name) {
      setErr("Please enter your full name.");
      return;
    }
    if (!mail) {
      setErr("Please enter your email.");
      return;
    }
    if (!p1) {
      setErr("Please create a password.");
      return;
    }
    if (p1.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (!p2) {
      setErr("Please confirm your password.");
      return;
    }
    if (p1 !== p2) {
      setErr("Passwords do not match. Please try again.");
      return;
    }

    // -------- call API --------
    setLoading(true);
    try {
      await api.register(name, mail, p1, p2);
      // ✅ success -> flip back / go login (ของคุณเดิม)
      goLoginWithFlipBack();
    } catch (ex: any) {
      // ✅ server error -> toast
      setErr(ex.message || "Register failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* LEFT: ให้เหมือนหน้า login เป๊ะ ๆ */}
        <section className={styles.left}>
          <img
            src="/assets/Collab2.png"
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
                Review overlays and a structured table (FDI, confidence, area, position), then
                export PNG + JSON for reporting.
              </p>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Clear overlays</p>
                <p className={styles.featureText}>Masks + contours with readable FDI labels.</p>
              </div>
              <div className={styles.feature}>
                <p className={styles.featureTitle}>Structured output</p>
                <p className={styles.featureText}>
                  FDI, score, area, and centroid for each tooth instance.
                </p>
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

        {/* RIGHT */}
        <section className={styles.right}>
          <div className={styles.rightStack}>
            <img
              src="/assets/VLU_logo_text.png"
              className={styles.rightTopLogo}
            />

            <AuthFlipCard
              flipped={flipped}
              onFlipEnd={(isBack) => {
                if (!isBack && pendingNav) {
                  // ✅ หน่วงนิดเดียวให้สายตารับรู้ว่า “จบการ์ด” ก่อนเปลี่ยนหน้า
                  window.setTimeout(() => {
                    router.push(pendingNav);
                    setPendingNav(null);
                  }, 120);
                }
              }}
              front={
                <StudentIDCard
                  email=""
                  password=""
                  loading={false}
                  err={null}
                  apiBase={undefined}
                  onEmailChange={() => {}}
                  onPasswordChange={() => {}}
                  onSubmit={(e) => e.preventDefault()}
                  onForgot={() => {}}
                  onRegister={() => {}}
                />
              }
              back={
                <div className={styles.regBack}>
                  <div className={styles.regTeal} />
                    {err && (
                      <div className={styles.regToastErr} role="alert" aria-live="polite">
                        {err}
                      </div>
                    )}
                  <div className={styles.regContent}>
                    <h2 className={styles.regTitle}>Register</h2>
                    <p className={styles.regSub}>then sign in on the login page</p>

                    <form className={styles.regForm} onSubmit={onSubmit}>
                      <input
                        className={styles.regInput}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        placeholder="Full name"
                      />

                      <input
                        className={styles.regInput}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="Email"
                      />

                      <input
                        className={styles.regInput}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        type="password"
                        placeholder="Password"
                      />

                      <input
                        className={styles.regInput}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        type="password"
                        placeholder="Confirm Password"
                      />

                      <button className={styles.regPrimary} type="submit">
                          {loading ? "Please wait..." : "Create account"}
                        </button>

                      <div className={styles.regDivider} />

                      <div className={styles.regBottomRow}>
                        <button
                          className={styles.regLoginPill}
                          type="button"
                          onClick={goLoginWithFlipBack}
                        >
                          Login
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}