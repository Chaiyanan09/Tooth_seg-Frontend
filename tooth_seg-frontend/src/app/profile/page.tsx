"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [editName, setEditName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.get()) return router.push("/login");
    api.me()
      .then((u) => { setFullName(u.fullName); setEmail(u.email); })
      .catch(() => { auth.clear(); router.push("/login"); });
  }, [router]);

  async function saveName() {
    setErr(null); setMsg(null); setSaving(true);
    try {
      const r = await api.updateMe(fullName.trim());
      setFullName(r.fullName);
      setEmail(r.email);
      setEditName(false);
      setMsg("Profile updated.");
    } catch (e: any) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    auth.clear();
    router.push("/login");
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: 24, maxWidth: 900 }}>
        <h1 style={{ marginTop: 0, fontSize: 34 }}>Profile</h1>

        <div style={{
          marginTop: 14,
          padding: 18,
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 18,
          background: "white",
          boxShadow: "0 10px 26px rgba(0,0,0,0.06)"
        }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>Full name</div>

              {!editName ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{fullName}</div>
                  <button
                    onClick={() => setEditName(true)}
                    style={{ borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontWeight: 800 }}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    style={{ borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(46,125,50,0.35)", background: "rgba(46,125,50,0.10)", cursor: "pointer", fontWeight: 900 }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditName(false)}
                    style={{ borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(0,0,0,0.12)", background: "white", cursor: "pointer", fontWeight: 800 }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>Email</div>
              <div style={{ fontWeight: 800 }}>{email}</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <button
                onClick={() => router.push(`/forgot-password?email=${encodeURIComponent(email)}`)}
                style={{ borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(229,57,53,0.25)", background: "rgba(229,57,53,0.08)", fontWeight: 900, cursor: "pointer" }}
              >
                Change password
              </button>

              <button
                onClick={logout}
                style={{ borderRadius: 12, padding: "10px 12px", border: "1px solid rgba(0,0,0,0.12)", background: "white", fontWeight: 900, cursor: "pointer" }}
              >
                Logout
              </button>
            </div>

            {msg && <div style={{ padding: 10, borderRadius: 12, background: "rgba(46,125,50,0.08)", border: "1px solid rgba(46,125,50,0.18)" }}>{msg}</div>}
            {err && <div style={{ padding: 10, borderRadius: 12, background: "rgba(229,57,53,0.10)", border: "1px solid rgba(229,57,53,0.20)" }}><b>Error:</b> {err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}