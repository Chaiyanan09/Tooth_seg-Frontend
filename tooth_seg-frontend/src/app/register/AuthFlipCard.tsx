"use client";

import { useEffect, useState } from "react";
import styles from "../login/login.module.css";

type Props = {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  autoFlip?: boolean;
  onFlipEnd?: (flipped: boolean) => void;
};

export default function AuthFlipCard({ front, back, flipped, autoFlip = true, onFlipEnd }: Props) {
  const isControlled = typeof flipped === "boolean";
  const [innerFlipped, setInnerFlipped] = useState(false);

  useEffect(() => {
    if (isControlled) return;
    if (!autoFlip) return;
    const t = requestAnimationFrame(() => setInnerFlipped(true));
    return () => cancelAnimationFrame(t);
  }, [autoFlip, isControlled]);

  const showBack = isControlled ? (flipped as boolean) : innerFlipped;

  return (
    <div className={styles.flipWrap} data-flipped={showBack ? "true" : "false"}>
      <div
        className={styles.flipInner}
        onTransitionEnd={(e) => {
          if (e.propertyName !== "transform") return;
          onFlipEnd?.(showBack);
        }}
      >
        <div className={`${styles.flipFace} ${styles.flipFront}`}>{front}</div>
        <div className={`${styles.flipFace} ${styles.flipBack}`}>{back}</div>
      </div>
    </div>
  );
}