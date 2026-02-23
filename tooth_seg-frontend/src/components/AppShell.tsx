"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./appShell.module.css";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Image from "next/image";

type Me = {
  fullName: string;
};

type AppShellCtx = {
  user: Me | null;
  loading: boolean;
};

const Ctx = createContext<AppShellCtx>({ user: null, loading: true });

export function useAppUser() {
  return useContext(Ctx);
}

type NavItem = {
  label: string;
  href: string;
};

// ✅ ถ้า Home ของคุณอยู่ /home ให้ใช้แบบนี้
const NAV: NavItem[] = [
  { label: "Home", href: "/home" },
  { label: "News", href: "/news" },
  { label: "ToothInSeg", href: "/toothinseg" },
  { label: "History", href: "/history" },
  { label: "Profile", href: "/profile" },
];

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function normalizePath(p: string) {
  const x = (p || "/").replace(/\/+$/, "");
  return x === "" ? "/" : x;
}

function isActive(href: string, pathname: string) {
  const h = normalizePath(href);
  const p = normalizePath(pathname);

  // ให้ Home ติดทั้ง "/home" และ "/"
  if (h === "/home") return p === "/home" || p === "/";
  if (h === "/") return p === "/" || p === "/home";

  // route อื่น ๆ ติดเมื่ออยู่หน้าเดียวกัน หรืออยู่ใต้ path นั้น
  return p === h || p.startsWith(h + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.get()) {
      router.push("/login");
      return;
    }

    let alive = true;
    setLoading(true);

    api
      .me()
      .then((u) => {
        if (!alive) return;
        setUser({ fullName: u.fullName });
      })
      .catch(() => {
        auth.clear();
        router.push("/login");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [router]);

  const ctxValue = useMemo(() => ({ user, loading }), [user, loading]);

  const onLogout = () => {
    auth.clear();
    router.push("/login");
  };

  return (
    <Ctx.Provider value={ctxValue}>
      <div className={styles.root}>
        <div className={styles.shellRow}>
          {/* ✅ 1) sidebar */}
          <aside className={styles.sidebar} data-shell="sidebar">
            <div className={styles.brand}>
              <Image
                src="/assets/VLU_logo.png"
                alt="VLU logo"
                width={44}
                height={44}
                className={styles.brandLogo}
                priority
              />

              <div className={styles.brandText}>
                <div className={styles.brandTitle}>ToothInSeg</div>
                <div className={styles.brandSub}>Dental X-ray AI</div>
              </div>
            </div>

            <nav className={styles.nav}>
              {NAV.map((item) => {
                const active = isActive(item.href, pathname || "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(styles.navLink, active && styles.navLinkActive)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className={styles.sidebarSpacer} />

            <div className={styles.sideBottom}>
              <button className={styles.logoutBtn} onClick={onLogout} type="button">
                Logout
              </button>
            </div>
          </aside>

          <main className={styles.main}>
            {/* ✅ 2) topbar */}
            <header className={styles.topBar} data-shell="topbar">
              <div className={styles.userPill}>
                {loading ? "..." : user?.fullName ?? "Guest"}
              </div>
            </header>

            {/* ✅ 3) content */}
            <div className={styles.content} data-shell="content">
              {children}
            </div>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}