"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./protected.module.css";

export default function ContentTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    setAnim(true);
    const t = window.setTimeout(() => setAnim(false), 260); // ✅ ยาวขึ้น
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div key={pathname} className={`${styles.contentWrap} ${anim ? styles.contentIn : ""}`}>
      {children}
    </div>
  );
}