"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./appShell.module.css";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import Image from "next/image";

type Me = { fullName: string };

type AppShellCtx = {
  user: Me | null;
  loading: boolean;
};

const Ctx = createContext<AppShellCtx>({ user: null, loading: true });

export function useAppUser() {
  return useContext(Ctx);
}

type NavItem = { label: string; href: string };

const NAV: NavItem[] = [
  { label: "Home", href: "/home" },
  { label: "Guide", href: "/guide" },
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

  if (h === "/home") return p === "/home" || p === "/";
  if (h === "/") return p === "/" || p === "/home";
  return p === h || p.startsWith(h + "/");
}

const LOGOUT_ANIM_MS = 520;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ NEW
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!auth.get()) {
      router.replace("/login");
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
        router.replace("/login");
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
    if (leaving) return;

    // ✅ เล่น exit animation ก่อน
    setLeaving(true);

    window.setTimeout(() => {
      auth.clear();
      router.replace("/login");
    }, LOGOUT_ANIM_MS);
  };

  return (
    <Ctx.Provider value={ctxValue}>
      {/* ✅ IMPORTANT: apply rootLeaving class */}
      <div className={cx(styles.root, leaving && styles.rootLeaving)}>
        <div className={styles.shellRow}>
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
                    aria-disabled={leaving ? "true" : "false"}
                    tabIndex={leaving ? -1 : 0}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className={styles.sidebarSpacer} />

            <div className={styles.sideBottom}>
              <button
                className={styles.logoutBtn}
                onClick={onLogout}
                type="button"
                disabled={leaving}
              >
                Logout
              </button>
            </div>
          </aside>

          <main className={styles.main}>
            <header className={styles.topBar} data-shell="topbar">
              <div className={styles.userPill}>
                {loading ? "..." : user?.fullName ?? "Guest"}
              </div>
            </header>

            <div className={styles.content} data-shell="content">
              {children}
            </div>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}