"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./guide.module.css";

type TocItem = { id: string; label: string };
type RelatedLink = { label: string; href: string };

export default function GuidePage() {
  const toc = useMemo<TocItem[]>(
    () => [
      { id: "overview", label: "Overview" },
      { id: "login", label: "Login" },
      { id: "register", label: "Register" },
      { id: "home", label: "Home dashboard" },
      { id: "predict", label: "Predict workflow" },
      { id: "export", label: "Export results" },
      { id: "history", label: "History" },
      { id: "profile", label: "Profile" },
      { id: "faq", label: "FAQ" },
    ],
    []
  );

  // ✅ Scrollspy active section id
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "overview");

  // ✅ Scroll reveal (slide-in blocks) + ✅ scroll out -> hide (toggle)
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (prefersReduced) {
      els.forEach((el) => el.setAttribute("data-in", "true"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) el.setAttribute("data-in", "true");
          else el.removeAttribute("data-in");
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -12% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ✅ Scrollspy (highlight toc) — ใช้ IntersectionObserver
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-spy][id]")
    );
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          // เอาตัวที่อยู่ "ใกล้ top" กว่าเป็น active
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));

        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).id;
          if (id) setActiveId(id);
          return;
        }

        // fallback กันเคสเลื่อนเร็วมาก
        const y = window.scrollY;
        let best = sections[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const el of sections) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          const dist = Math.abs(top - y - 120);
          if (dist < bestDist) {
            bestDist = dist;
            best = el;
          }
        }
        if (best?.id) setActiveId(best.id);
      },
      {
        // ทำให้ active ตอน section มาอยู่โซนบน
        root: null,
        rootMargin: "-18% 0px -70% 0px",
        threshold: [0.08, 0.16, 0.24, 0.32],
      }
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.head} data-reveal style={{ ["--d" as any]: "0ms" }}>
        <div>
          <h1 className={styles.title}>Guide</h1>
          <p className={styles.sub}>
            ToothInSeg user guide — learn the workflow from Login → Predict → Export.
          </p>
        </div>

        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            placeholder="Search in guide… (coming soon)"
            disabled
          />
        </div>
      </div>

      {/* Body: TOC + Content */}
      <div className={styles.grid}>
        {/* TOC */}
        <aside className={styles.toc} data-reveal style={{ ["--d" as any]: "60ms" }}>
          <div className={styles.tocBox}>
            <div className={styles.tocTitle}>Contents</div>

            <nav className={styles.tocNav}>
              {toc.map((it) => {
                const active = activeId === it.id;
                return (
                  <a
                    key={it.id}
                    className={`${styles.tocLink} ${active ? styles.tocLinkActive : ""}`}
                    href={`#${it.id}`}
                    aria-current={active ? "true" : undefined}
                  >
                    {it.label}
                  </a>
                );
              })}
            </nav>

            <div className={styles.callout}>
              <div className={styles.calloutTitle}>Tip</div>
              <div className={styles.calloutText}>
                Use the links above to jump to any section instantly.
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className={styles.doc}>
          {/* OVERVIEW — block layout (A+C) */}
          <ProtocolSection
            id="overview"
            title="Overview"
            protocolId="GUIDE-OVERVIEW-00"
            summary="What ToothInSeg does and what you can export."
            tags={["Panoramic X-ray", "FDI numbering", "Overlay + JSON"]}
            objective="Explain the core workflow: Upload → Predict → Review → Export."
            steps={[
              "Upload a panoramic X-ray to create a case.",
              "Run prediction to generate masks and FDI labels.",
              "Review overlays and structured outputs.",
              "Export results for reporting and audit.",
            ]}
            outputs={[
              "Overlay preview: masks + contours + readable tooth labels.",
              "PNG export: presentation-ready overlay image.",
              "JSON export: structured results (FDI, confidence, area, centroid/position).",
            ]}
            troubleshooting={[
              "If the page feels slow, large images may take longer to render.",
              "If export fails, check your browser download permissions.",
            ]}
            related={[
              { label: "Login", href: "#login" },
              { label: "Predict workflow", href: "#predict" },
              { label: "Export results", href: "#export" },
            ]}
            delayMs={80}
          >
            <div className={styles.cards3}>
              <InfoCard title="Upload" desc="Upload a panoramic X-ray to start a new case." />
              <InfoCard title="Predict" desc="Run the model to generate masks and FDI labels." />
              <InfoCard title="Export" desc="Export PNG overlay and JSON structured results." />
            </div>
          </ProtocolSection>

          <ProtocolSection
            id="login"
            title="Login"
            protocolId="AUTH-LOGIN-01"
            summary="Sign in to access predictions and your case history."
            tags={["Authentication", "Required"]}
            objective="Allow verified users to access ToothInSeg features securely."
            steps={[
              "Enter your email and password.",
              "Click the Login button.",
              "If fields are missing, a toast message will guide you.",
            ]}
            outputs={[
              "Session access token saved in the browser (used for API requests).",
              "Redirect to Home dashboard after successful login.",
            ]}
            troubleshooting={[
              "If login fails: verify email/password, then use “Forgot password”.",
              "If you still cannot log in: contact the system administrator.",
            ]}
            related={[
              { label: "Forgot password", href: "/forgot-password" },
              { label: "Register", href: "#register" },
            ]}
            delayMs={110}
            tone="warning"
            note="If login fails, verify your credentials or reset your password via “Forgot password”."
          />

          <ProtocolSection
            id="register"
            title="Register"
            protocolId="AUTH-REGISTER-01"
            summary="Create an account to store your prediction history."
            tags={["Authentication", "Account"]}
            objective="Create a new user profile and enable protected access."
            steps={[
              "Fill in Full name, Email, Password, and Confirm password.",
              "Click Create account.",
              "Validation errors are shown via toast messages.",
            ]}
            outputs={[
              "New user account created (if email is not already used).",
              "Redirect back to Login for sign-in.",
            ]}
            troubleshooting={[
              "If password mismatch: confirm password must match exactly.",
              "If email is already used: try signing in or reset your password.",
            ]}
            related={[
              { label: "Back to Login", href: "#login" },
              { label: "Profile", href: "#profile" },
            ]}
            delayMs={140}
          />

          <ProtocolSection
            id="home"
            title="Home dashboard"
            protocolId="APP-HOME-01"
            summary="Quick overview of your account and project context."
            tags={["Dashboard", "Quick Start"]}
            objective="Provide a quick summary and a clear entry point to the workflow."
            steps={[
              "Review status cards (Models, Dataset, Pipeline).",
              "Use the sidebar to navigate to ToothInSeg / History / Profile.",
            ]}
            outputs={[
              "Readable summary of the app and research pipeline.",
              "Navigation entry point to core workflows.",
            ]}
            troubleshooting={[
              "If your name shows as “Guest”, your session may have expired.",
              "Try refreshing; if it persists, log out and log in again.",
            ]}
            related={[
              { label: "Predict workflow", href: "#predict" },
              { label: "History", href: "#history" },
            ]}
            delayMs={170}
          />

          <ProtocolSection
            id="predict"
            title="Predict workflow"
            protocolId="PANO-PREDICT-01"
            summary="Upload an image, run prediction, review outputs."
            tags={["Prediction", "Panoramic X-ray"]}
            objective="Generate tooth instance masks and FDI numbering from a panoramic X-ray."
            steps={[
              "Open the ToothInSeg menu.",
              "Upload a panoramic X-ray image.",
              "Click Predict and wait for the result.",
              "Review overlay and the structured output table.",
            ]}
            outputs={[
              "Overlay visualization: masks/contours + tooth labels.",
              "Table output: FDI, confidence, area, and location features.",
            ]}
            troubleshooting={[
              "Prediction time depends on image size and server load.",
              "If results look incomplete, re-check image quality or orientation.",
            ]}
            related={[
              { label: "Export results", href: "#export" },
              { label: "History", href: "#history" },
            ]}
            delayMs={200}
          />

          <ProtocolSection
            id="export"
            title="Export results"
            protocolId="EXPORT-RESULTS-01"
            summary="Download PNG overlay and JSON for reporting."
            tags={["Export", "Audit-ready"]}
            objective="Create report-ready assets and structured outputs for downstream use."
            steps={[
              "After prediction, open the Export panel.",
              "Download PNG overlay for visual reporting.",
              "Download JSON for structured analysis and audit trail.",
            ]}
            outputs={[
              "PNG export: overlay (mask/contour + labels).",
              "JSON export: instances (FDI, score, area, centroid/position).",
            ]}
            troubleshooting={[
              "If download is blocked, allow downloads in browser settings.",
              "If JSON is empty, ensure prediction finished successfully.",
            ]}
            related={[
              { label: "Predict workflow", href: "#predict" },
              { label: "History", href: "#history" },
            ]}
            delayMs={230}
          />

          <ProtocolSection
            id="history"
            title="History"
            protocolId="CASE-HISTORY-01"
            summary="Revisit and manage previous cases."
            tags={["Cases", "Audit"]}
            objective="Help users locate past predictions and re-download exports."
            steps={[
              "Open History from the sidebar.",
              "Select a previous case to review.",
              "Re-download exports if needed.",
            ]}
            outputs={["Case list and metadata.", "Access to previously exported artifacts."]}
            troubleshooting={[
              "If history is empty, ensure you are logged in with the correct account.",
              "If a case fails to load, the record may be incomplete.",
            ]}
            related={[
              { label: "Export results", href: "#export" },
              { label: "Profile", href: "#profile" },
            ]}
            delayMs={260}
          />

          <ProtocolSection
            id="profile"
            title="Profile"
            protocolId="USER-PROFILE-01"
            summary="Edit your display name and access quick security actions."
            tags={["Account", "Security"]}
            objective="Allow users to maintain their account information."
            steps={[
              "Open Profile from the sidebar.",
              "Edit your display name if needed.",
              "Use quick actions for password reset.",
            ]}
            outputs={["Updated display name (if saved successfully).", "Password reset navigation."]}
            troubleshooting={[
              "If saving fails, check your connection and try again.",
              "If session expires, log in again.",
            ]}
            related={[
              { label: "Home", href: "#home" },
              { label: "FAQ", href: "#faq" },
            ]}
            delayMs={290}
          />

          {/* FAQ — still block style */}
          <section
            id="faq"
            className={`${styles.section} ${styles.block}`}
            data-reveal
            data-spy
            style={{ ["--d" as any]: "320ms" }}
          >
            <div className={styles.blockTop}>
              <div>
                <h2 className={styles.h2}>FAQ</h2>
                <p className={styles.blockSummary}>
                  Common questions about workflow, performance, and troubleshooting.
                </p>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.protoId}>FAQ</span>
                <div className={styles.tagRow}>
                  <span className={styles.tag}>Common</span>
                  <span className={styles.tag}>Support</span>
                </div>
              </div>
            </div>

            <div className={styles.faqGrid}>
              <details className={styles.faq} data-reveal style={{ ["--d" as any]: "380ms" }}>
                <summary>Why do animations feel different across pages?</summary>
                <p className={styles.muted}>
                  Heavier entrance animations are usually used only after login, while sidebar
                  navigation uses lighter transitions to avoid distraction.
                </p>
              </details>

              <details className={styles.faq} data-reveal style={{ ["--d" as any]: "420ms" }}>
                <summary>What should I do if I cannot log in?</summary>
                <p className={styles.muted}>
                  Double-check email/password, then use “Forgot password” if needed.
                </p>
              </details>

              <details className={styles.faq} data-reveal style={{ ["--d" as any]: "460ms" }}>
                <summary>What files can I upload?</summary>
                <p className={styles.muted}>
                  Use supported panoramic X-ray formats configured by the system (commonly PNG or
                  JPG). If unsure, export from your viewer as PNG.
                </p>
              </details>
            </div>
          </section>

          <div className={styles.footer} data-reveal style={{ ["--d" as any]: "520ms" }}>
            <div className={styles.footerLine} />
            <div className={styles.footerText}>ToothInSeg • Guide — reference draft</div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- components ---------- */

function InfoCard(props: { title: string; desc: string }) {
  return (
    <div className={styles.infoCard} data-reveal style={{ ["--d" as any]: "0ms" }}>
      <div className={styles.infoTitle}>{props.title}</div>
      <div className={styles.infoDesc}>{props.desc}</div>
    </div>
  );
}

function ProtocolSection(props: {
  id: string;
  title: string;
  protocolId: string;
  summary: string;
  tags: string[];
  objective: string;
  steps: string[];
  outputs: string[];
  troubleshooting: string[];
  related: RelatedLink[];
  delayMs?: number;
  note?: string;
  tone?: "info" | "warning" | "danger";
  children?: React.ReactNode;
}) {
  const d = props.delayMs ?? 0;

  return (
    <section
      id={props.id}
      className={`${styles.section} ${styles.block}`}
      data-reveal
      data-spy
      style={{ ["--d" as any]: `${d}ms` }}
    >
      <div className={styles.blockTop}>
        <div>
          <h2 className={styles.h2}>{props.title}</h2>
          <p className={styles.blockSummary}>{props.summary}</p>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.protoId}>{props.protocolId}</span>
          <div className={styles.tagRow}>
            {props.tags.map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {props.children ? <div className={styles.blockExtra}>{props.children}</div> : null}

      <div className={styles.protoGrid}>
        <div className={styles.protoMain}>
          <div className={styles.protoCard} data-reveal style={{ ["--d" as any]: `${d + 80}ms` }}>
            <div className={styles.protoCardTitle}>Objective</div>
            <div className={styles.protoCardText}>{props.objective}</div>
          </div>

          <div className={styles.protoCard} data-reveal style={{ ["--d" as any]: `${d + 120}ms` }}>
            <div className={styles.protoCardTitle}>Steps</div>
            <ol className={styles.stepList}>
              {props.steps.map((s, i) => (
                <li key={i} className={styles.stepItem}>
                  <span className={styles.stepNo}>{i + 1}</span>
                  <span className={styles.stepText}>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.protoCard} data-reveal style={{ ["--d" as any]: `${d + 160}ms` }}>
            <div className={styles.protoCardTitle}>Outputs</div>
            <ul className={styles.outList}>
              {props.outputs.map((x, i) => (
                <li key={i} className={styles.outItem}>
                  {x}
                </li>
              ))}
            </ul>
          </div>

          {props.note ? (
            <div
              className={`${styles.note} ${
                props.tone === "danger"
                  ? styles.noteDanger
                  : props.tone === "warning"
                  ? styles.noteWarning
                  : styles.noteInfo
              }`}
              data-reveal
              style={{ ["--d" as any]: `${d + 200}ms` }}
            >
              {props.note}
            </div>
          ) : null}
        </div>

        <aside className={styles.protoAside}>
          <div className={styles.asideCard} data-reveal style={{ ["--d" as any]: `${d + 120}ms` }}>
            <div className={styles.asideTitle}>Troubleshooting</div>
            <ul className={styles.troubleList}>
              {props.troubleshooting.map((x, i) => (
                <li key={i} className={styles.troubleItem}>
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.asideCard} data-reveal style={{ ["--d" as any]: `${d + 160}ms` }}>
            <div className={styles.asideTitle}>Related</div>
            <div className={styles.relatedRow}>
              {props.related.map((r) => (
                <a key={r.href + r.label} className={styles.relatedPill} href={r.href}>
                  {r.label}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}