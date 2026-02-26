"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../history.module.css";

import { api, type PredictResponse } from "@/lib/api";

const TZ = "Asia/Bangkok";

type HistoryItem = PredictResponse & {
  id?: string;
  _id?: any;
  createdAt?: string;
  path?: string;
  modelName?: string;
  inferenceMs?: number;
  inference_ms?: number;
  presentFdi?: string[];
  present_fdi?: string[];
  missingFdi?: string[];
  missing_fdi?: string[];
  overlayUrl?: string;
  overlay_url?: string;
  overlayPngBase64?: string;
  overlay_png_base64?: string;
  mlRawJson?: string;
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

function getPresentFdi(r?: any): string[] {
  if (!r) return [];
  return r.presentFdi || r.present_fdi || [];
}

function sortFdi(list: string[]) {
  return [...list].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

function getOverlayUrl(r?: any): string | null {
  if (!r) return null;
  return r.overlayUrl || r.overlay_url || null;
}

function getOverlayB64(r?: any): string | null {
  if (!r) return null;
  return r.overlayPngBase64 || r.overlay_png_base64 || null;
}

function getOverlaySrc(r?: any): string | null {
  const url = getOverlayUrl(r);
  if (url) return url;
  const b64 = getOverlayB64(r);
  if (b64) return `data:image/png;base64,${b64}`;
  return null;
}

function b64ToUint8Array(b64: string) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getOverlayBytes(r?: any): Promise<Uint8Array | null> {
  const b64 = getOverlayB64(r);
  if (b64) return b64ToUint8Array(b64);

  const url = getOverlayUrl(r);
  if (url) {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  }
  return null;
}

async function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const obj = URL.createObjectURL(blob);
  a.href = obj;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(obj);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json" });
  return downloadBlob(blob, filename);
}

function replaceExt(path: string, ext: string) {
  const i = path.lastIndexOf(".");
  if (i < 0) return path + ext;
  return path.slice(0, i) + ext;
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
  // dayKey expected: YYYY-MM-DD
  if (!dayKey || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dayKey)) return dayKey || "-";

  // Build a stable timestamp (avoid "Invalid time value")
  const d = new Date(`${dayKey}T00:00:00.000+07:00`);
  if (Number.isNaN(d.getTime())) return dayKey;

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
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
/** ===== Modal zoom/pan viewer (portal) ===== */
function ViewerModal({
  open,
  onClose,
  title,
  imageUrl,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  imageUrl: string;
  onDownload: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panningRef = useRef(false);
  const drag = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setScale(1);
    setTx(0);
    setTy(0);
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(8, +(s + 0.25).toFixed(2)));
      if (e.key === "-" || e.key === "_") setScale((s) => Math.max(0.2, +(s - 0.25).toFixed(2)));
      if (e.key === "0") {
        setScale(1);
        setTx(0);
        setTy(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = (canvasRef.current ?? e.currentTarget).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const vx = e.clientX - cx;
    const vy = e.clientY - cy;

    const nextScale = clamp(scale * (e.deltaY > 0 ? 0.9 : 1.1), 0.2, 8);
    const k = nextScale / scale;

    setTx(vx - (vx - tx) * k);
    setTy(vy - (vy - ty) * k);
    setScale(+nextScale.toFixed(2));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panningRef.current = true;
    drag.current = { x: e.clientX, y: e.clientY, ox: tx, oy: ty };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!panningRef.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setTx(drag.current.ox + dx);
    setTy(drag.current.oy + dy);
  };

  const onPointerUp = () => {
    panningRef.current = false;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = scale < 2 ? 2.5 : 1;
    setScale(next);
    if (next === 1) {
      setTx(0);
      setTy(0);
    }
  };

  const onBackdropDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} onMouseDown={onBackdropDown} role="dialog" aria-modal="true">
      <div className={styles.modalPanel} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle} title={title}>
            {title}
          </div>

          <div className={styles.modalActions}>
            <button className={styles.btnSm} onClick={() => setScale((s) => Math.max(0.2, +(s - 0.25).toFixed(2)))}>
              −
            </button>
            <button className={styles.btnSm} onClick={() => setScale((s) => Math.min(8, +(s + 0.25).toFixed(2)))}>
              +
            </button>
            <button
              className={styles.btnSm}
              onClick={() => {
                setScale(1);
                setTx(0);
                setTy(0);
              }}
            >
              Reset
            </button>
            <button className={styles.btnSm} onClick={onDownload}>
              Download
            </button>
            <button ref={closeBtnRef} className={styles.btnSm} onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div
          ref={canvasRef}
          className={styles.modalCanvas}
          onWheelCapture={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <img
            src={imageUrl}
            alt="overlay"
            draggable={false}
            className={styles.modalImg}
            style={{ transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function HistoryDayPage() {
  const params = useParams() as Record<string, string | string[]>;
  const raw = params?.day;
  const dayKey = decodeURIComponent(Array.isArray(raw) ? raw[0] : (raw ?? ""));
  const dayLabel = formatDay(dayKey);

const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<HistoryItem[]>([]);

  // cache for fresh signed urls / raw json
  const [detailMap, setDetailMap] = useState<Record<string, PredictResponse>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerDownload, setViewerDownload] = useState<() => void>(() => () => {});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setDetailMap({});
      requestedRef.current.clear();

      try {
        const list = (await api.history()) as HistoryItem[];
        if (cancelled) return;

        const filtered = list.filter((it) => it.createdAt && dayKeyFromISO(it.createdAt) === dayKey);
        filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        setItems(filtered);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load history");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  async function ensureDetail(id: string, force = false): Promise<PredictResponse | null> {
    if (!id) return null;
    if (!force && detailMap[id]) return detailMap[id];

    try {
      const d = await api.historyOne(id);
      setDetailMap((prev) => ({ ...prev, [id]: d }));
      return d;
    } catch {
      return null;
    }
  }


  // Prefetch signed preview URLs (Method A): if history list doesn't contain overlayUrl,
  // we fetch /api/history/{id} for those items in background and cache it in detailMap.
  useEffect(() => {
    let cancelled = false;

    const need = items
      .map((it) => ({ it, id: getId(it) }))
      .filter(({ it, id }) => !!id && !getOverlaySrc(it) && !requestedRef.current.has(id));

    if (!need.length) return;

    const concurrency = 4;
    let cursor = 0;

    async function worker() {
      while (!cancelled) {
        const cur = need[cursor++];
        if (!cur) break;

        const id = cur.id;
        if (!id) continue;

        requestedRef.current.add(id);

        try {
          const d = await api.historyOne(id);
          if (cancelled) return;
          setDetailMap((prev) => ({ ...prev, [id]: d }));
        } catch {
          // ignore
        }
      }
    }

    const runners = Array.from({ length: Math.min(concurrency, need.length) }, () => worker());
    Promise.all(runners).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [items]);

  const count = items.length;
  const missingSum = useMemo(() => items.reduce((a, b) => a + getMissingFdi(b).length, 0), [items]);

  const openViewer = async (it: HistoryItem) => {
    const id = getId(it);

    // try refresh signed url for best UX (cloudinary signed URL may expire)
    const d = id ? await ensureDetail(id, true) : null;
    const overlaySrc = getOverlaySrc(d) || getOverlaySrc(it);

    if (!overlaySrc) return;

    setViewerTitle(it.path || id || "prediction");
    setViewerUrl(overlaySrc);
    setViewerDownload(() => () => downloadPredictPng(it));
    setViewerOpen(true);
  };

  const downloadPredictPng = async (it: HistoryItem) => {
    const id = getId(it);
    const d = id ? await ensureDetail(id, true) : null;
    const merged = d ? { ...it, ...d } : it;

    const bytes = await getOverlayBytes(merged);
    if (!bytes) return;

    const fileName = replaceExt(it.path || id || "predict", "_predict.png");
    function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
      const ab = new ArrayBuffer(u8.byteLength);
      new Uint8Array(ab).set(u8);
      return ab;
    }

    await downloadBlob(new Blob([u8ToArrayBuffer(bytes)], { type: "image/png" }), fileName);
  };

  const downloadJson = async (it: HistoryItem) => {
    const id = getId(it);
    const d = id ? await ensureDetail(id) : null;

    // Prefer real ML raw json if available
    const raw = (d as any)?.mlRawJson || (it as any)?.mlRawJson;
    if (typeof raw === "string" && raw.trim().length) {
      return downloadText(raw, replaceExt(it.path || id || "predict", ".json"));
    }

    // fallback: compact JSON
    const payload = {
      id,
      createdAt: it.createdAt,
      path: it.path,
      modelName: (it as any).modelName,
      inferenceMs: it.inferenceMs ?? it.inference_ms,
      presentFdi: getPresentFdi(it),
      missingFdi: getMissingFdi(it),
    };

    return downloadText(JSON.stringify(payload, null, 2), replaceExt(it.path || id || "predict", ".json"));
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.kicker}>History • Day</div>
            <h1 className={styles.title}>{dayLabel}</h1>
            <p className={styles.subtitle}>All predictions made on this date (for the logged-in user) — timezone: {TZ}</p>

            <div className={styles.breadcrumb}>
              <Link href="/history">History</Link>
              <span>›</span>
              <span>{dayKey}</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/history">
              Back
            </Link>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/toothinseg">
              Predict new
            </Link>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Images</span>
            <b>{count}</b>
          </div>
          <div className={styles.stat}>
            <span>Missing (sum)</span>
            <b>{missingSum}</b>
          </div>
          <div className={styles.stat}>
            <span>Fetched details</span>
            <b>{Object.keys(detailMap).length}</b>
          </div>
        </div>
      </header>

      {loading && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>Loading...</div>
            <div className={styles.emptyDesc}>Loading predictions for the selected date…</div>
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

      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No items</div>
            <div className={styles.emptyDesc}>No predictions on this date.</div>
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <section className={styles.itemGrid}>
          {items.map((it, idx) => {
            const id = getId(it) || String(idx);

            // Use cached (fresh) url if available
            const merged = detailMap[id] ? ({ ...it, ...detailMap[id] } as any) : it;
            const overlaySrc = getOverlaySrc(merged);

            const createdAt = it.createdAt;
            const time = createdAt ? formatTime(createdAt) : "-";
            const inference = it.inferenceMs ?? it.inference_ms;

            const missing = sortFdi(getMissingFdi(it));
            const present = getPresentFdi(it);

            return (
              <article key={id} className={styles.itemCard}>
                <div className={styles.itemHead}>
                  <div>
                    <div className={styles.itemTitle}>{it.path || id}</div>
                    <div className={styles.itemMeta}>
                      {time}
                      {inference ? ` • ${inference} ms` : ""}
                      {(it as any).modelName ? ` • ${(it as any).modelName}` : ""}
                    </div>
                  </div>

                  <div className={styles.dayCount} title="Index">
                    {idx + 1}
                  </div>
                </div>

                <div className={styles.imgWrap}>
                  {overlaySrc ? (
                    <img
                      src={overlaySrc}
                      alt="overlay"
                      className={`${styles.img} ${styles.imgBtn}`}
                      onClick={() => openViewer(it)}
                      onError={() => {
                        const id0 = getId(it);
                        if (id0) void ensureDetail(id0, true);
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 320,
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(255,255,255,0.85)",
                        fontWeight: 900,
                        background: "linear-gradient(135deg, rgba(225,29,72,0.25), rgba(15,118,110,0.25))",
                      }}
                    >
                      No preview
                    </div>
                  )}
                </div>

                <div className={styles.teethSummary}>
                  <div className={styles.teethRow}>
                    <div className={styles.teethKey}>Missing</div>
                    <div className={styles.teethVal}>
                      {missing.length ? (
                        <div className={styles.pillRow}>
                          {missing.map((fdi) => (
                            <span key={fdi} className={`${styles.pill} ${styles.pillMissing}`}>
                              {fdi}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.noneText}>None detected</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.teethRow}>
                    <div className={styles.teethKey}>Present</div>
                    <div className={styles.teethVal}>
                      <span className={styles.countText}>{present?.length ?? 0} teeth</span>
                    </div>
                  </div>
                </div>

                <div className={styles.actionRow}>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!overlaySrc} onClick={() => openViewer(it)}>
                    View / Zoom
                  </button>

                  <button className={styles.btn} disabled={!overlaySrc} onClick={() => downloadPredictPng(it)}>
                    Download PNG
                  </button>

                  <button className={styles.btn} onClick={() => downloadJson(it)}>
                    Download JSON
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <ViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title={viewerTitle}
        imageUrl={viewerUrl}
        onDownload={viewerDownload}
      />
    </div>
  );
}
