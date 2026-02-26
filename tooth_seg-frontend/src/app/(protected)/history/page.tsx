"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./history.module.css";

import { api, type PredictResponse } from "@/lib/api";

const TZ = "Asia/Bangkok";

type HistoryItem = PredictResponse & {
  id?: string;
  _id?: any;
  userId?: string;
  createdAt?: string;
  path?: string;
  modelName?: string;
  inferenceMs?: number;
  inference_ms?: number;
  presentFdi?: string[];
  present_fdi?: string[];
  missingFdi?: string[];
  missing_fdi?: string[];
};

type DayGroup = {
  dayKey: string; // YYYY-MM-DD
  count: number;
  latestAt: string;
  earliestAt: string;
  totalMissing: number;
};

function getId(x: any): string {
  if (!x) return "";
  if (typeof x.id === "string") return x.id;
  if (typeof x._id === "string") return x._id;
  if (x._id && typeof x._id === "object" && typeof x._id.$oid === "string") return x._id.$oid;
  return "";
}

function getMissingFdi(r?: any): string[] {
  if (!r) return [];
  return r.missingFdi || r.missing_fdi || [];
}

function dayKeyFromISO(iso: string): string {
  const d = new Date(iso);
  // 'sv-SE' => YYYY-MM-DD
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDay(dayKey: string): string {
  // Use noon UTC to avoid edge cases (Bangkok has no DST)
  const d = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dayKey || "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [rawCount, setRawCount] = useState(0);

  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const list = (await api.history()) as HistoryItem[];
        if (cancelled) return;

        setRawCount(list.length);

        const map = new Map<string, DayGroup>();
        for (const it of list) {
          const createdAt = it.createdAt;
          if (!createdAt) continue;

          const dk = dayKeyFromISO(createdAt);
          const miss = getMissingFdi(it);

          const prev = map.get(dk);
          if (!prev) {
            map.set(dk, {
              dayKey: dk,
              count: 1,
              latestAt: createdAt,
              earliestAt: createdAt,
              totalMissing: miss.length,
            });
          } else {
            prev.count += 1;
            prev.totalMissing += miss.length;
            if (createdAt > prev.latestAt) prev.latestAt = createdAt;
            if (createdAt < prev.earliestAt) prev.earliestAt = createdAt;
          }
        }

        const arr = Array.from(map.values()).sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
        setGroups(arr);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load history");
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return groups;
    return groups.filter((g) => {
      const thai = formatDay(g.dayKey).toLowerCase();
      return g.dayKey.includes(qq) || thai.includes(qq);
    });
  }, [groups, q]);

  const totalDays = groups.length;
  const totalImages = rawCount;
  const totalMissing = useMemo(() => groups.reduce((a, b) => a + (b.totalMissing || 0), 0), [groups]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.kicker}>History</div>
            <h1 className={styles.title}>Prediction History</h1>
            <p className={styles.subtitle}>Grouped by day (timezone: {TZ}) — click a day to view all predictions from that date.</p>
          </div>

          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => location.reload()} disabled={loading}>
              Refresh
            </button>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/toothinseg">
              Predict new
            </Link>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Days</span>
            <b>{totalDays}</b>
          </div>
          <div className={styles.stat}>
            <span>Images</span>
            <b>{totalImages}</b>
          </div>
          <div className={styles.stat}>
            <span>Total missing (sum)</span>
            <b>{totalMissing}</b>
          </div>
        </div>

        <div className={styles.tools}>
          <input
            className={styles.search}
            placeholder="Search by date (e.g., 2026-02-26)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </header>

      {loading && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>Loading...</div>
            <div className={styles.emptyDesc}>Loading prediction history…</div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>Error</div>
            <div className={styles.emptyDesc}>{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No results</div>
            <div className={styles.emptyDesc}>No results match your search.</div>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <section className={styles.dayGrid}>
          {filtered.map((g) => {
            const thai = formatDay(g.dayKey);
            const last = g.latestAt ? formatTime(g.latestAt) : "-";
            return (
              <article
                key={g.dayKey}
                className={styles.dayCard}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/history/${encodeURIComponent(g.dayKey)}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") router.push(`/history/${encodeURIComponent(g.dayKey)}`);
                }}
              >
                <div className={styles.dayTop}>
                  <div>
                    <div className={styles.dayTitle}>{thai}</div>
                    <div className={styles.daySub}>Key: {g.dayKey} • Last: {last}</div>
                  </div>
                  <div className={styles.dayCount}>{g.count}</div>
                </div>

                <div className={styles.dayMetaRow}>
                  <span className={`${styles.chip} ${styles.chipStrong}`}>Images: {g.count}</span>
                  <span className={styles.chip}>Missing total: {g.totalMissing}</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* tiny hint for debugging */}
      {!loading && !error && totalImages === 0 && (
        <div className={styles.hint}>
          If nothing shows up: check <b>NEXT_PUBLIC_API_BASE</b> points to your backend and you are logged in (token present).
        </div>
      )}
    </div>
  );
}
