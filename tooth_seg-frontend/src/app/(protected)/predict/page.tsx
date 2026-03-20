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
  path: string;
  previewUrl: string;
  status: Status;
  result?: PredictResponse;
  error?: string;
};

function keyOf(file: File) {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

function niceSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRelPath(file: File) {
  const maybeFile = file as File & { webkitRelativePath?: string };
  return maybeFile.webkitRelativePath && maybeFile.webkitRelativePath.length
    ? maybeFile.webkitRelativePath
    : file.name;
}

function replaceExt(path: string, ext: string) {
  const i = path.lastIndexOf(".");
  if (i < 0) return `${path}${ext}`;
  return `${path.slice(0, i)}${ext}`;
}

function safeZipRelPath(path: string) {
  let value = (path || "").replace(/\\/g, "/");
  value = value.replace(/^\/+/, "");
  while (value.includes("..")) value = value.replace("..", "");
  return value || "file.png";
}

function b64ToUint8Array(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

async function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json" });
  return downloadBlob(blob, filename);
}

function getOverlayUrl(result?: PredictResponse | null): string | null {
  if (!result) return null;
  return (result as PredictResponse & { overlay_url?: string }).overlayUrl ||
    (result as PredictResponse & { overlay_url?: string }).overlay_url ||
    null;
}

function getOverlayB64(result?: PredictResponse | null): string | null {
  if (!result) return null;
  return (result as PredictResponse & { overlay_png_base64?: string }).overlayPngBase64 ||
    (result as PredictResponse & { overlay_png_base64?: string }).overlay_png_base64 ||
    null;
}

function getOverlaySrc(result?: PredictResponse | null): string | null {
  const url = getOverlayUrl(result);
  if (url) return url;
  const b64 = getOverlayB64(result);
  if (b64) return `data:image/png;base64,${b64}`;
  return null;
}

function getPresentFdi(result?: PredictResponse | null): string[] {
  if (!result) return [];
  return (
    (result as PredictResponse & { presentFdi?: string[]; present_fdi?: string[] }).presentFdi ||
    (result as PredictResponse & { presentFdi?: string[]; present_fdi?: string[] }).present_fdi ||
    []
  );
}

function getMissingFdi(result?: PredictResponse | null): string[] {
  if (!result) return [];
  return (
    (result as PredictResponse & { missingFdi?: string[]; missing_fdi?: string[] }).missingFdi ||
    (result as PredictResponse & { missingFdi?: string[]; missing_fdi?: string[] }).missing_fdi ||
    []
  );
}

function sortFdi(list: string[]) {
  return [...list].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

async function getOverlayBytes(result?: PredictResponse | null): Promise<Uint8Array | null> {
  const b64 = getOverlayB64(result);
  if (b64) return b64ToUint8Array(b64);

  const url = getOverlayUrl(result);
  if (!url) return null;

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function getInferenceMs(result?: PredictResponse | null) {
  if (!result) return null;
  const value = (result as PredictResponse & { inference_ms?: number }).inferenceMs ??
    (result as PredictResponse & { inference_ms?: number }).inference_ms;
  return typeof value === "number" ? value : null;
}

function statusClass(status: Status) {
  if (status === "DONE") return styles.badgeDone;
  if (status === "FAILED") return styles.badgeFail;
  if (status === "RUNNING") return styles.badgeRun;
  if (status === "QUEUED") return styles.badgeQueue;
  return styles.badgeIdle;
}

function statusLabel(status: Status) {
  if (status === "IDLE") return "Ready";
  if (status === "QUEUED") return "Queued";
  if (status === "RUNNING") return "Running";
  if (status === "DONE") return "Completed";
  return "Failed";
}

function buildJsonPayload(item: Item) {
  return {
    file: item.path,
    id: item.result?.id,
    createdAt: item.result?.createdAt,
    inferenceMs: getInferenceMs(item.result),
    presentFdi: getPresentFdi(item.result),
    missingFdi: getMissingFdi(item.result),
    instances: item.result?.instances ?? [],
  };
}

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

  const panningRef = useRef(false);
  const dragRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

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

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") {
        setScale((current) => Math.min(8, +(current + 0.25).toFixed(2)));
      }
      if (event.key === "-" || event.key === "_") {
        setScale((current) => Math.max(0.2, +(current - 0.25).toFixed(2)));
      }
      if (event.key === "0") {
        setScale(1);
        setTx(0);
        setTy(0);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = (canvasRef.current ?? event.currentTarget).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const vx = event.clientX - cx;
    const vy = event.clientY - cy;

    const nextScale = clamp(scale * (event.deltaY > 0 ? 0.9 : 1.1), 0.2, 8);
    const ratio = nextScale / scale;

    setTx(vx - (vx - tx) * ratio);
    setTy(vy - (vy - ty) * ratio);
    setScale(+nextScale.toFixed(2));
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    panningRef.current = true;
    dragRef.current = { x: event.clientX, y: event.clientY, ox: tx, oy: ty };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!panningRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setTx(dragRef.current.ox + dx);
    setTy(dragRef.current.oy + dy);
  };

  const onPointerUp = () => {
    panningRef.current = false;
  };

  const onBackdropMouseDown = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div className={styles.modalOverlay} onMouseDown={onBackdropMouseDown} role="dialog" aria-modal="true">
      <div className={styles.modalPanel} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle} title={title}>
            {title}
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.btnSm}
              onClick={() => setScale((current) => Math.max(0.2, +(current - 0.25).toFixed(2)))}
              title="Zoom out"
            >
              −
            </button>
            <button
              className={styles.btnSm}
              onClick={() => setScale((current) => Math.min(8, +(current + 0.25).toFixed(2)))}
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
            <button ref={closeBtnRef} className={styles.btnSm} onClick={onClose} title="Close">
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
        >
          <img
            src={imageUrl}
            alt="prediction overlay"
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
  const itemsRef = useRef<Item[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const total = items.length;
  const doneCount = useMemo(() => items.filter((item) => item.status === "DONE").length, [items]);
  const failCount = useMemo(() => items.filter((item) => item.status === "FAILED").length, [items]);
  const finishedCount = useMemo(
    () => items.filter((item) => item.status === "DONE" || item.status === "FAILED").length,
    [items]
  );
  const progressPct = total ? Math.round((finishedCount / total) * 100) : 0;
  const hasCompletedItem = useMemo(() => items.some((item) => item.status === "DONE"), [items]);

  const addFiles = (files: File[]) => {
    const nextItems = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        key: keyOf(file),
        file,
        path: getRelPath(file),
        previewUrl: URL.createObjectURL(file),
        status: "IDLE" as Status,
      }));

    setItems((prev) => {
      const map = new Map(prev.map((item) => [item.key, item]));
      for (const nextItem of nextItems) {
        const previous = map.get(nextItem.key);
        if (previous) URL.revokeObjectURL(previous.previewUrl);
        map.set(nextItem.key, nextItem);
      }
      return Array.from(map.values());
    });
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.key !== key);
    });
  };

  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
  };

  const openViewer = (title: string, imageUrl: string, onDownload: () => void) => {
    setViewerTitle(title);
    setViewerUrl(imageUrl);
    setViewerDownload(() => onDownload);
    setViewerOpen(true);
  };

  const downloadPredictPng = async (item: Item) => {
    const bytes = await getOverlayBytes(item.result);
    if (!bytes) return;

    await downloadBlob(
      new Blob([u8ToArrayBuffer(bytes)], { type: "image/png" }),
      replaceExt(item.file.name, "_predict.png")
    );
  };

  const predictAll = async () => {
    if (!items.length || running) return;
    setRunning(true);

    setItems((prev) =>
      prev.map((item) =>
        item.status === "DONE"
          ? item
          : { ...item, status: "QUEUED", error: undefined, result: undefined }
      )
    );

    const snapshot = itemsRef.current;

    for (const item of snapshot) {
      if (item.status === "DONE") continue;

      setItems((prev) =>
        prev.map((current) => (current.key === item.key ? { ...current, status: "RUNNING" } : current))
      );

      try {
        const result = await api.predict(item.file, item.path);
        setItems((prev) =>
          prev.map((current) =>
            current.key === item.key ? { ...current, status: "DONE", result } : current
          )
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Predict failed";
        setItems((prev) =>
          prev.map((current) =>
            current.key === item.key ? { ...current, status: "FAILED", error: message } : current
          )
        );
      }
    }

    setRunning(false);
  };

  const downloadAllZip = async () => {
    if (!hasCompletedItem) return;

    const zip = new JSZip();
    const inputDir = zip.folder("input");
    const predictDir = zip.folder("predict");
    const jsonDir = zip.folder("json");

    for (const item of items) {
      const rel = safeZipRelPath(item.path);

      try {
        const buffer = await item.file.arrayBuffer();
        inputDir?.file(rel, new Uint8Array(buffer));
      } catch {
        // ignore file read failure for input copy
      }

      if (item.status !== "DONE" || !item.result) continue;

      const overlayBytes = await getOverlayBytes(item.result);
      if (overlayBytes) {
        predictDir?.file(replaceExt(rel, ".png"), u8ToArrayBuffer(overlayBytes));
      }

      jsonDir?.file(replaceExt(rel, ".json"), JSON.stringify(buildJsonPayload(item), null, 2));
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `toothinseg_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.kicker}>Instance Segmentation</div>
            <h1 className={styles.title}>Predict</h1>
            <p className={styles.subtitle}>
              Upload dental X-ray images, run prediction, then view or download the result.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={predictAll} disabled={!items.length || running}>
              {running ? "Predicting..." : "Predict"}
            </button>
            <button className={styles.btn} onClick={downloadAllZip} disabled={!hasCompletedItem}>
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
        <input
          ref={imgInputRef}
          className={styles.hiddenInput}
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        />

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
          onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        />

        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive(false);
          }}
          onDrop={onDrop}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button")) return;
            imgInputRef.current?.click();
          }}
        >
          <div className={styles.dropLeft}>
            <div className={styles.dropIcon}>🦷</div>
            <div>
              <div className={styles.dropTitle}>Drop images here or click to browse</div>
              <div className={styles.dropHint}>JPG, PNG • multiple files • folder upload supported</div>
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
            Progress <b>{finishedCount}</b> / {total}
          </div>
        </div>
      </section>

      {!items.length && (
        <div className={styles.empty}>
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>No images selected</div>
            <div className={styles.emptyDesc}>Choose images or a folder to start prediction.</div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {items.map((item) => {
          const overlaySrc = getOverlaySrc(item.result);
          const missingSorted = sortFdi(getMissingFdi(item.result));
          const present = getPresentFdi(item.result);
          const canView = item.status === "DONE" && Boolean(overlaySrc);
          const inferenceMs = getInferenceMs(item.result);

          return (
            <article key={item.key} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleWrap}>
                  <div className={styles.cardTitle} title={item.path}>
                    {item.file.name}
                  </div>
                  <div className={styles.cardMeta}>
                    {item.path !== item.file.name ? `${item.path} • ` : ""}
                    {niceSize(item.file.size)}
                    {typeof inferenceMs === "number" ? ` • ${Math.round(inferenceMs)} ms` : ""}
                  </div>
                </div>

                <div className={styles.cardRight}>
                  <span className={`${styles.badge} ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                  <button className={styles.iconBtn} onClick={() => removeItem(item.key)} disabled={running} title="Remove">
                    ✕
                  </button>
                </div>
              </div>

              {item.status === "FAILED" && <div className={styles.errorBox}>❌ {item.error}</div>}

              <div className={styles.previewGrid}>
                <div className={styles.previewCol}>
                  <div className={styles.previewLabel}>Original</div>
                  <div className={styles.imgWrap}>
                    <img src={item.previewUrl} className={styles.img} alt="input" />
                  </div>
                </div>

                <div className={styles.previewCol}>
                  <div className={styles.previewLabel}>Prediction</div>

                  {(item.status === "QUEUED" || item.status === "RUNNING") && (
                    <div className={styles.loadingText}>
                      {item.status === "QUEUED" ? "Queued..." : "Running prediction..."}
                    </div>
                  )}

                  {item.status === "DONE" && overlaySrc && (
                    <>
                      <div className={styles.imgWrap}>
                        <img
                          src={overlaySrc}
                          className={`${styles.img} ${styles.imgZoom}`}
                          alt="prediction"
                          onClick={() => openViewer(item.path, overlaySrc, () => downloadPredictPng(item))}
                        />
                      </div>

                      <div className={styles.teethSummary}>
                        <div className={styles.teethRow}>
                          <div className={styles.teethKey}>Missing teeth</div>
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
                          <div className={styles.teethKey}>Detected teeth</div>
                          <div className={styles.teethVal}>
                            <span className={styles.countText}>{present.length} teeth</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          disabled={!canView}
                          onClick={() => openViewer(item.path, overlaySrc, () => downloadPredictPng(item))}
                        >
                          View
                        </button>
                        <button className={styles.btn} disabled={!canView} onClick={() => downloadPredictPng(item)}>
                          PNG
                        </button>
                        <button
                          className={styles.btn}
                          disabled={item.status !== "DONE" || !item.result}
                          onClick={() => downloadText(JSON.stringify(buildJsonPayload(item), null, 2), replaceExt(item.file.name, ".json"))}
                        >
                          JSON
                        </button>
                      </div>
                    </>
                  )}

                  {item.status === "DONE" && !overlaySrc && (
                    <div className={styles.warnBox}>
                      ⚠️ Prediction finished, but no overlay image was returned.
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
