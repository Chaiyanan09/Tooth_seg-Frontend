"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!auth.get()) {
      router.push("/login");
      return;
    }
    api.me().then((u) => setName(u.fullName)).catch(() => {
      auth.clear();
      router.push("/login");
    });
  }, [router]);

  return (
    <div>
      <Navbar />
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Home</h2>
        <p>Welcome, <b>{name || "..."}</b></p>
        <p>This is a placeholder page. Next step: Upload & Predict.</p>
      </div>
    </div>
  );
}