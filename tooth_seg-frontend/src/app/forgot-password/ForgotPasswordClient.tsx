"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./forgot.module.css";

type Props = {
  initialEmail?: string;
};

export default function ForgotPasswordClient({ initialEmail = "" }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const em = email.trim();
    if (!em) return setErr("Email is required.");

    setLoading(true);
    try {
      const r = await api.forgotPassword(em);
      setMsg(r.message || "If the account exists, a reset link will be sent to your email.");
    } catch (ex: any) {
      setErr(ex.message || "Request failed");
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
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.sub}>Enter your email and we’ll send you a password reset link.</p>

        <form className={styles.form} onSubmit={send}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <div className={styles.row}>
            <button className={styles.primary} type="submit" disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <button className={styles.secondary} type="button" onClick={() => router.push("/login")}>
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

        <div className={styles.hint}>Tip: Check inbox/spam. Link expires in 15 minutes.</div>
      </div>
    </div>
  );
}