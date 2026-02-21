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

  useEffect(() => {
    if (!auth.get()) {
      router.push("/login");
      return;
    }
    api.me()
      .then((u) => {
        setFullName(u.fullName);
        setEmail(u.email);
      })
      .catch(() => {
        auth.clear();
        router.push("/login");
      });
  }, [router]);

  function logout() {
    auth.clear();
    router.push("/login");
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: 24, maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>Profile</h2>

        <div
          style={{
            marginTop: 12,
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 16,
            padding: 16,
            background: "white",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "rgba(0,0,0,0.6)", fontSize: 12 }}>Full name</div>
            <div style={{ fontWeight: 800 }}>{fullName || "..."}</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "rgba(0,0,0,0.6)", fontSize: 12 }}>Email</div>
            <div style={{ fontWeight: 700 }}>{email || "..."}</div>
          </div>

          <button
            onClick={logout}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(229,57,53,0.35)",
              background: "rgba(229,57,53,0.12)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}