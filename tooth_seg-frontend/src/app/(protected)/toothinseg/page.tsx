"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import { api, PredictResponse } from "@/lib/api";
import styles from "./page.module.css";

type Status = "IDLE" | "QUEUED" | "RUNNING" | "DONE" | "FAILED";

type Item = {
  key: string;
  file: File;
  path: string; // webkitRelativePath or filename
  previewUrl: string;

  status: Status;
  result?: PredictResponse;
  error?: string;
};

function keyOf(f: File) {
  return `${f.name}_${f.size}_${f.lastModified}`;
}

function niceSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRelPath(f: File) {
  // @ts-ignore
  const rel = (f as any).webkitRelativePath as string | undefined;
  return rel && rel.length ? rel : f.name;
}

function replaceExt(path: string, ext: string) {
  const i = path.lastIndexOf(".");
  if (i < 0) return path + ext;
  return path.slice(0, i) + ext;
}

function safeZipRelPath(p: string) {
  let s = (p || "").replace(/\\/g, "/");
  s = s.replace(/^\/+/, "");
  while (s.includes("..")) s = s.replace("..", "");
  return s || "file.png";
}

function b64ToUint8Array(b64: string) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
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
  downloadBlob(blob, filename);
}

/** ===== Overlay helpers (supports base64 and url) ===== */
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

/** ===== Teeth helpers (supports camelCase and snake_case) ===== */
function getPresentFdi(r?: any): string[] | null {
  if (!r) return null;
  return r.presentFdi || r.present_fdi || null;
}

function getMissingFdi(r?: any): string[] | null {
  if (!r) return null;
  return r.missingFdi || r.missing_fdi || null;
}

function sortFdi(list: string[]) {
  // FDI codes are like "11", "18", "48" (2 digits). Keep stable & numeric.
  return [...list].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
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

function statusClass(s: Status) {
  if (s === "DONE") return styles.badgeDone;
  if (s === "FAILED") return styles.badgeFail;
  if (s === "RUNNING") return styles.badgeRun;
  if (s === "QUEUED") return styles.badgeQueue;
  return styles.badgeIdle;
}

/** ===== Modal zoom/pan viewer (improved) ===== */
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

  // Render via portal to avoid being trapped in any transformed/scrolling parent
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panningRef = useRef(false);
  const drag = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Prevent background scroll (works when page scroll is on <body>/<html>)
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

    // Focus a real control so the viewport doesn't jump on some layouts
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

  // Zoom towards cursor + prevent page scroll
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

  // Close only if clicking on the real backdrop
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
            <button
              className={styles.btnSm}
              onClick={() => setScale((s) => Math.max(0.2, +(s - 0.25).toFixed(2)))}
              title="Zoom out"
            >
              −
            </button>
            <button
              className={styles.btnSm}
              onClick={() => setScale((s) => Math.min(8, +(s + 0.25).toFixed(2)))}
              title="Zoom in"
            >
              +
            </button>
            <button
              className={styles.btnSm}
              onClick={() => {
                setScale(1);
                setTx(0);
                setTy(0);
              }}
              title="Reset view"
            >
              Reset
            </button>
            <button className={styles.btnSm} onClick={onDownload} title="Download PNG">
              Download
            </button>
            <button ref={closeBtnRef} className={styles.btnSm} onClick={onClose} title="Close (Esc)">
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
            style={{
              transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`,
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ToothInSegPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerDownload, setViewerDownload] = useState<() => void>(() => () => {});

  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // avoid stale revoke
  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
  }, []);

  const total = items.length;
  const doneCount = useMemo(() => items.filter((x) => x.status === "DONE").length, [items]);
  const failCount = useMemo(() => items.filter((x) => x.status === "FAILED").length, [items]);
  const finishedCount = useMemo(
    () => items.filter((x) => x.status === "DONE" || x.status === "FAILED").length,
    [items]
  );
  const progressPct = total ? Math.round((finishedCount / total) * 100) : 0;

  const addFiles = (files: File[]) => {
    const next = files
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        key: keyOf(f),
        file: f,
        path: getRelPath(f),
        previewUrl: URL.createObjectURL(f),
        status: "IDLE" as Status,
      }));

    setItems((prev) => {
      const map = new Map(prev.map((x) => [x.key, x]));

      for (const n of next) {
        const old = map.get(n.key);
        if (old) URL.revokeObjectURL(old.previewUrl);
        map.set(n.key, n);
      }
      return Array.from(map.values());
    });
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const found = prev.find((x) => x.key === key);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((x) => x.key !== key);
    });
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
  };

  const openViewer = (title: string, imageUrl: string, onDownload: () => void) => {
    setViewerTitle(title);
    setViewerUrl(imageUrl);
    setViewerDownload(() => onDownload);
    setViewerOpen(true);
  };

  const downloadPredictPng = async (it: Item) => {
    const bytes = await getOverlayBytes(it.result);
    if (!bytes) return;
    await downloadBlob(
      new Blob([u8ToArrayBuffer(bytes)], { type: "image/png" }),
      replaceExt(it.file.name, "_predict.png")
    );
  };

  const predictAll = async () => {
    if (!items.length || running) return;
    setRunning(true);

    setItems((prev) =>
      prev.map((x) =>
        x.status === "DONE" ? x : { ...x, status: "QUEUED", error: undefined, result: undefined }
      )
    );

    const snapshot = itemsRef.current;

    for (const it of snapshot) {
      if (it.status === "DONE") continue;

      setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, status: "RUNNING" } : x)));
      try {
        const r = await api.predict(it.file, it.path);
        setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, status: "DONE", result: r } : x)));
      } catch (e: any) {
        setItems((prev) =>
          prev.map((x) =>
            x.key === it.key ? { ...x, status: "FAILED", error: e?.message ?? "Predict failed" } : x
          )
        );
      }
    }

    setRunning(false);
  };

  const downloadAllZip = async () => {
    if (!items.some((x) => x.status === "DONE")) return;

    const zip = new JSZip();
    const inputDir = zip.folder("input");
    const predictDir = zip.folder("predict");
    const jsonDir = zip.folder("json");

    for (const it of items) {
      const rel = safeZipRelPath(it.path);

      // input/<path>
      try {
        const buf = await it.file.arrayBuffer();
        inputDir?.file(rel, new Uint8Array(buf));
      } catch {}

      if (it.status !== "DONE" || !it.result) continue;

      // predict/<path>.png
      const predBytes = await getOverlayBytes(it.result);
      if (predBytes) {
        const outRel = replaceExt(rel, ".png");
        predictDir?.file(outRel, u8ToArrayBuffer(predBytes));
      }

      // json/<path>.json
      const payload = {
        file: it.path,
        id: (it.result as any)?.id,
        createdAt: (it.result as any)?.createdAt,
        inferenceMs: (it.result as any)?.inferenceMs ?? (it.result as any)?.inference_ms,
        presentFdi: getPresentFdi(it.result) ?? [],
        missingFdi: getMissingFdi(it.result) ?? [],
        instances: (it.result as any)?.instances ?? [],
      };
      jsonDir?.file(replaceExt(rel, ".json"), JSON.stringify(payload, null, 2));
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `toothinseg_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    addFiles(files);
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.kicker}>Instance Segmentation</div>
            <h1 className={styles.title}>ToothInSeg</h1>
            <p className={styles.subtitle}>
              Select images/folder → Predict → Click the prediction to zoom → Download PNG/JSON or a combined ZIP
            </p>
          </div>

          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={predictAll} disabled={!items.length || running}>
              {running ? "Predicting..." : "Predict"}
            </button>

            <button className={styles.btn} onClick={downloadAllZip} disabled={!items.some((x) => x.status === "DONE")}>
              Download ZIP
            </button>

            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={clearAll} disabled={!items.length || running}>
              Clear
            </button>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Files</span>
            <b>{total}</b>
          </div>
          <div className={styles.stat}>
            <span>Done</span>
            <b>{doneCount}</b>
          </div>
          <div className={styles.stat}>
            <span>Failed</span>
            <b>{failCount}</b>
          </div>
          <div className={styles.stat}>
            <span>Progress</span>
            <b>{progressPct}%</b>
          </div>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <section className={styles.toolbar}>
        {/* hidden inputs */}
        <input
          ref={imgInputRef}
          className={styles.hiddenInput}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        />

        {/* @ts-ignore */}
        <input
          ref={folderInputRef}
          className={styles.hiddenInput}
          type="file"
          multiple
          accept="image/*"
          // @ts-ignore
          webkitdirectory="true"
          // @ts-ignore
          directory="true"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
        />

        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={onDrop}
          onClick={(e) => {
            const el = e.target as HTMLElement;
            if (el.closest("button")) return;
            imgInputRef.current?.click();
          }}
        >
          <div className={styles.dropLeft}>
            <div className={styles.dropIcon}>🦷</div>
            <div>
              <div className={styles.dropTitle}>Drop images here, or click to browse</div>
              <div className={styles.dropHint}>Supports JPG/PNG • Multi-select • Folder upload supported</div>
            </div>
          </div>

          <div className={styles.dropActions}>
            <button className={styles.btn} onClick={() => imgInputRef.current?.click()} type="button">
              Select images
            </button>
            <button className={styles.btn} onClick={() => folderInputRef.current?.click()} type="button">
              Select folder
            </button>
          </div>
        </div>

        <div className={styles.toolbarFoot}>
          <div className={styles.miniHelp}>
            * ZIP includes: <b>input/</b>, <b>predict/</b>, <b>json/</b>
          </div>
          <div className={styles.miniHelp}>
            Progress: <b>{finishedCount}</b> / {total}
          </div>
        </div>
      </section>

      {!items.length && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No images yet</div>
            <div className={styles.emptyDesc}>
              Click <b>Select images</b> / <b>Select folder</b> or drag & drop above.
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {items.map((it) => {
          const overlaySrc = getOverlaySrc(it.result);
          const canView = it.status === "DONE" && !!overlaySrc;
          const missing = it.status === "DONE" ? getMissingFdi(it.result) : null;
          const present = it.status === "DONE" ? getPresentFdi(it.result) : null;
          const missingSorted = missing ? sortFdi(missing) : [];

          return (
            <article key={it.key} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleWrap}>
                  <div className={styles.cardTitle} title={it.path}>
                    {it.path}
                  </div>
                  <div className={styles.cardMeta}>
                    {it.file.name} • {niceSize(it.file.size)}
                  </div>
                </div>

                <div className={styles.cardRight}>
                  <span className={`${styles.badge} ${statusClass(it.status)}`}>{it.status}</span>
                  <button className={styles.iconBtn} onClick={() => removeItem(it.key)} disabled={running} title="Remove">
                    ✕
                  </button>
                </div>
              </div>

              {it.status === "FAILED" && <div className={styles.errorBox}>❌ {it.error}</div>}

              <div className={styles.previewGrid}>
                <div className={styles.previewCol}>
                  <div className={styles.previewLabel}>Input</div>
                  <div className={styles.imgWrap}>
                    <img src={it.previewUrl} className={styles.img} alt="input" />
                  </div>
                </div>

                <div className={styles.previewCol}>
                  <div className={styles.previewLabel}>Prediction</div>

                  {(it.status === "QUEUED" || it.status === "RUNNING") && (
                    <div className={styles.loadingText}>{it.status === "QUEUED" ? "Queued..." : "Running..."}</div>
                  )}

                  {it.status === "DONE" && overlaySrc && (
                    <>
                      <div className={styles.imgWrap}>
                        <img
                          src={overlaySrc}
                          className={`${styles.img} ${styles.imgZoom}`}
                          alt="prediction"
                          onClick={() => openViewer(it.path, overlaySrc, () => downloadPredictPng(it))}
                        />
                      </div>

                      <div className={styles.teethSummary}>
                        <div className={styles.teethRow}>
                          <div className={styles.teethKey}>Missing</div>
                          <div className={styles.teethVal}>
                            {missingSorted.length ? (
                              <div className={styles.pillRow}>
                                {missingSorted.map((fdi) => (
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

                      <div className={styles.cardActions}>
                        <button
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          disabled={!canView}
                          onClick={() => openViewer(it.path, overlaySrc, () => downloadPredictPng(it))}
                        >
                          View / Zoom
                        </button>

                        <button className={styles.btn} disabled={!canView} onClick={() => downloadPredictPng(it)}>
                          Download PNG
                        </button>

                        <button
                          className={styles.btn}
                          disabled={it.status !== "DONE" || !it.result}
                          onClick={() => {
                            const payload = {
                              file: it.path,
                              id: (it.result as any)?.id,
                              createdAt: (it.result as any)?.createdAt,
                              inferenceMs: (it.result as any)?.inferenceMs ?? (it.result as any)?.inference_ms,
                              presentFdi: getPresentFdi(it.result) ?? [],
                              missingFdi: getMissingFdi(it.result) ?? [],
                              instances: (it.result as any)?.instances ?? [],
                            };
                            downloadText(JSON.stringify(payload, null, 2), replaceExt(it.file.name, ".json"));
                          }}
                        >
                          Download JSON
                        </button>
                      </div>
                    </>
                  )}

                  {it.status === "DONE" && !overlaySrc && (
                    <div className={styles.warnBox}>
                      ⚠️ Completed, but no overlay found in the response (overlayPngBase64/overlayUrl).
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

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