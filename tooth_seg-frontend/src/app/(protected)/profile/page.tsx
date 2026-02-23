"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [editName, setEditName] = useState(false);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.get()) {
      router.push("/login");
      return;
    }

    api
      .me()
      .then((u) => {
        setFullName(u.fullName);
        setEmail(u.email);
      })
      .catch(() => {
        auth.clear();
        router.push("/login");
      });
  }, [router]);

  const initials = useMemo(() => {
    const n = (fullName || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (a + b).toUpperCase();
  }, [fullName]);

  const emailDomain = useMemo(() => {
    const at = email.indexOf("@");
    return at >= 0 ? email.slice(at + 1) : "-";
  }, [email]);

  async function saveName() {
    setErr(null);
    setMsg(null);

    const next = fullName.trim();
    if (!next) {
      setErr("Full name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const r = await api.updateMe(next);
      setFullName(r.fullName);
      setEmail(r.email);
      setEditName(false);
      setMsg("Profile updated successfully.");
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function goChangePassword() {
    router.push(`/forgot-password?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.subtitle}>
            Manage your personal information and security.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{fullName || "..."}</div>
              <div className={styles.userEmail}>{email || "..."}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats (ทำให้ดูเต็มขึ้น) */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Account</div>
          <div className={styles.statValue}>{fullName ? "Active" : "Loading..."}</div>
          <div className={styles.statHint}>Signed in session</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Email Domain</div>
          <div className={styles.statValue}>{emailDomain}</div>
          <div className={styles.statHint}>Used for recovery</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Security</div>
          <div className={styles.statValue}>Password</div>
          <div className={styles.statHint}>Reset anytime</div>
        </div>
      </div>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Main Card */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2 className={styles.cardTitle}>Account details</h2>
              <p className={styles.cardDesc}>Keep your information up to date.</p>
            </div>

            {!editName ? (
              <button
                className={styles.btnOutline}
                onClick={() => setEditName(true)}
                type="button"
              >
                Edit
              </button>
            ) : (
              <span className={styles.badgeEdit}>Editing</span>
            )}
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fullName">
                Full name
              </label>

              {!editName ? (
                <div className={styles.valueText}>{fullName || "-"}</div>
              ) : (
                <div className={styles.editRow}>
                  <input
                    id="fullName"
                    className={styles.input}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />

                  <div className={styles.actionsRow}>
                    <button
                      className={styles.btnPrimary}
                      onClick={saveName}
                      disabled={saving}
                      type="button"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>

                    <button
                      className={styles.btnGhost}
                      onClick={() => {
                        setEditName(false);
                        setMsg(null);
                        setErr(null);
                        api.me().then((u) => {
                          setFullName(u.fullName);
                          setEmail(u.email);
                        });
                      }}
                      disabled={saving}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <div className={styles.valueText}>{email || "-"}</div>
              <p className={styles.helper}>
                This email is used for login and password recovery.
              </p>
            </div>

            <div className={styles.divider} />

            {msg && <div className={styles.alertSuccess}>{msg}</div>}
            {err && (
              <div className={styles.alertError}>
                <b>Error:</b> {err}
              </div>
            )}
          </div>
        </section>

        {/* Side Cards */}
        <aside className={styles.side}>
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Tips</h3>
            <ul className={styles.tipList}>
              <li>Use a strong password (12+ characters).</li>
              <li>Update your profile name to match official documents.</li>
              <li>If you changed your email, contact admin/support.</li>
            </ul>
          </div>

          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Quick actions</h3>
            <div className={styles.quickActions}>
              <button className={styles.btnPrimary} type="button" onClick={goChangePassword}>
                Reset password
              </button>
              <button className={styles.btnOutline} type="button" onClick={() => router.push("/home")}>
                Back to Home →
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}