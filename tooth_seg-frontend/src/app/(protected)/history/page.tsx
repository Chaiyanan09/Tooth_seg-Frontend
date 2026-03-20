"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

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
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDay(dayKey: string): string {
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

function buildDayGroups(list: HistoryItem[]): DayGroup[] {
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

  return Array.from(map.values()).sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
}

export default function HistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState("");
  const [deletingDayKey, setDeletingDayKey] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = (await api.history()) as HistoryItem[];
      setItems(list);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const groups = useMemo(() => buildDayGroups(items), [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return groups;

    return groups.filter((g) => {
      const englishDate = formatDay(g.dayKey).toLowerCase();
      return g.dayKey.includes(qq) || englishDate.includes(qq);
    });
  }, [groups, q]);

  const totalDays = groups.length;
  const totalImages = items.length;
  const totalMissing = useMemo(
    () => groups.reduce((a, b) => a + (b.totalMissing || 0), 0),
    [groups]
  );

  async function deleteDayGroup(dayKey: string) {
    const group = groups.find((g) => g.dayKey === dayKey);
    const dayLabel = formatDay(dayKey);
    const count = group?.count ?? 0;

    const confirm = await Swal.fire({
      title: "Delete this day?",
      html: `This will permanently delete <b>${count}</b> prediction${count === 1 ? "" : "s"} from <b>${dayLabel}</b>.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete all",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      setDeletingDayKey(dayKey);

      Swal.fire({
        title: "Deleting...",
        text: "Please wait while the predictions are being deleted.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const ids = items
        .filter((it) => it.createdAt && dayKeyFromISO(it.createdAt) === dayKey)
        .map((it) => getId(it))
        .filter(Boolean);

      if (!ids.length) {
        Swal.close();
        await loadHistory();

        await Swal.fire({
          icon: "info",
          title: "No items found",
          text: "There are no predictions left for this date.",
          confirmButtonText: "OK",
        });

        return;
      }

      const results = await Promise.allSettled(ids.map((id) => api.historyDelete(id)));
      const deletedCount = results.filter((r) => r.status === "fulfilled").length;
      const failedCount = results.length - deletedCount;

      Swal.close();
      await loadHistory();

      if (failedCount === 0) {
        await Swal.fire({
          icon: "success",
          title: "Deleted",
          text: `${deletedCount} prediction${deletedCount === 1 ? "" : "s"} deleted from ${dayLabel}.`,
          confirmButtonText: "OK",
        });
      } else {
        await Swal.fire({
          icon: "warning",
          title: "Partially deleted",
          text: `${deletedCount} item(s) deleted, but ${failedCount} item(s) could not be deleted.`,
          confirmButtonText: "OK",
        });
      }
    } catch (e: any) {
      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: e?.message ?? "Failed to delete this day.",
        confirmButtonText: "OK",
      });
    } finally {
      setDeletingDayKey(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.kicker}>History</div>
            <h1 className={styles.title}>Prediction History</h1>
            <p className={styles.subtitle}>
              Grouped by day (timezone: {TZ}) — click a day to view all predictions from that date.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => void loadHistory()}
              disabled={loading || !!deletingDayKey}
            >
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
            const dayLabel = formatDay(g.dayKey);
            const last = g.latestAt ? formatTime(g.latestAt) : "-";
            const isDeleting = deletingDayKey === g.dayKey;

            return (
              <article
                key={g.dayKey}
                className={styles.dayCard}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isDeleting) {
                    router.push(`/history/${encodeURIComponent(g.dayKey)}`);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isDeleting) {
                    router.push(`/history/${encodeURIComponent(g.dayKey)}`);
                  }
                }}
              >
                <div className={styles.dayTop}>
                  <div>
                    <div className={styles.dayTitle}>{dayLabel}</div>
                    <div className={styles.daySub}>
                      Key: {g.dayKey} • Last: {last}
                    </div>
                  </div>

                  <div className={styles.dayCount}>{g.count}</div>
                </div>

                <div className={styles.dayMetaRow}>
                  <span className={`${styles.chip} ${styles.chipStrong}`}>Images: {g.count}</span>
                  <span className={styles.chip}>Missing total: {g.totalMissing}</span>

                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDeleting) {
                        void deleteDayGroup(g.dayKey);
                      }
                    }}
                    disabled={loading || isDeleting}
                    style={{
                      marginLeft: "auto",
                      borderColor: "rgba(220, 38, 38, 0.28)",
                      color: "#b91c1c",
                      background: "rgba(220, 38, 38, 0.08)",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      boxShadow: "none",
                    }}
                  >
                    {isDeleting ? "Deleting..." : "Delete day"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}