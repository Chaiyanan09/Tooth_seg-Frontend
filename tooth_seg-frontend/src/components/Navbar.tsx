"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    const token = auth.get();
    if (!token) {
      router.push("/login");
      return;
    }

    api.me()
      .then((u) => setFullName(u.fullName))
      .catch(() => {
        // token invalid/expired
        auth.clear();
        router.push("/login");
      });
  }, [router]);

  return (
    <div
    style={{
        width: "100%",
        boxSizing: "border-box",   // ✅ สำคัญมาก
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 18px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
    }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Link href="/home" style={{ fontWeight: 800, textDecoration: "none", color: "black" }}>
          Tooth Segmentation
        </Link>
        <Link href="/home" style={{ textDecoration: "none", color: "rgba(0,0,0,0.7)" }}>
          Home
        </Link>
      </div>

      <button
        onClick={() => router.push("/profile")}
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          background: "white",
          padding: "8px 12px",
          borderRadius: 999,
          cursor: "pointer",
          fontWeight: 700,
        }}
        title="Open profile"
      >
        {fullName || "Profile"}
      </button>
    </div>
  );
}