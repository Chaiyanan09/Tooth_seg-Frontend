"use client";

import { useEffect, useState } from "react";
import styles from "./protected.module.css";

export default function ShellIntro({ children }: { children: React.ReactNode }) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const flag = sessionStorage.getItem("after_login_shell_intro");
    if (flag === "1") {
      sessionStorage.removeItem("after_login_shell_intro");
      setPlay(true);
      const t = window.setTimeout(() => setPlay(false), 520);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <div className={`${styles.shellWrap} ${play ? styles.shellIntro : ""}`}>
      {children}
    </div>
  );
}