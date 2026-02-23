"use client";

import { useMemo } from "react";
import { useAppUser } from "@/components/AppShell";
import styles from "./home.module.css";

export default function HomePage() {
  const { user, loading } = useAppUser();
  const name = loading ? "..." : user?.fullName ?? "{fullName}";

  const initials = useMemo(() => {
    const n = (user?.fullName || "").trim();
    if (!n) return "U";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (a + b).toUpperCase();
  }, [user?.fullName]);

  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.kicker}>
            <span className={styles.dotRed} />
            <span className={styles.dotGreen} />
            ToothInSeg • Dental X-ray AI
          </div>

          <h1 className={styles.h1}>
            Hi <span className={styles.name}>{name}</span>
          </h1>
          <h2 className={styles.h2}>Welcome to ToothInSeg</h2>

          <p className={styles.lead}>
            A collaboration between the Faculty of Engineering (Computer Engineering), Kasetsart
            University, and the Faculty of Dentistry from Van Lang University.
          </p>

          <div className={styles.badges}>
            <span className={styles.badge}>Instance Segmentation</span>
            <span className={styles.badge}>FDI 32 Teeth</span>
            <span className={styles.badge}>Panoramic X-ray</span>
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{loading ? "…" : initials}</div>
            <div className={styles.profileMeta}>
              <div className={styles.profileName}>{loading ? "Loading…" : name}</div>
              <div className={styles.profileSub}>Ready to Upload & Predict</div>
            </div>
          </div>

          <div className={styles.miniGrid}>
            <div className={styles.miniCard}>
              <div className={styles.miniTitle}>Models</div>
              <div className={styles.miniValue}>Mask R-CNN / Mask2Former</div>
              <div className={styles.miniHint}>Compare & benchmark</div>
            </div>

            <div className={styles.miniCard}>
              <div className={styles.miniTitle}>Dataset</div>
              <div className={styles.miniValue}>Panoramic X-ray</div>
              <div className={styles.miniHint}>FDI 32-class labeling</div>
            </div>

            <div className={styles.miniCard}>
              <div className={styles.miniTitle}>Pipeline</div>
              <div className={styles.miniValue}>Upload → Predict → Export</div>
              <div className={styles.miniHint}>Fast clinical workflow</div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Collaboration</h3>
          <p className={styles.sectionDesc}>
            This website was created to study the best deep learning model developed for prediction,
            using a panoramic X-ray image as input.
          </p>
        </div>

        <div className={styles.cards2}>
          <div className={styles.imageCard}>
            <img className={styles.image} src="/assets/Team.png" alt="Team" />
            <div className={styles.imageOverlay} />
            <div className={styles.imageCaption}>
              <div className={styles.imageTitle}>Team</div>
              <div className={styles.imageText}>Engineering & Dentistry collaboration</div>
            </div>
          </div>

          <div className={styles.imageCard}>
            <img className={styles.image} src="/assets/Dental.png" alt="Dental" />
            <div className={styles.imageOverlay} />
            <div className={styles.imageCaption}>
              <div className={styles.imageTitle}>Dental</div>
              <div className={styles.imageText}>Clinical context & evaluation</div>
            </div>
          </div>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureHead}>
            <h3 className={styles.sectionTitle}>Panoramic X-ray segmentation</h3>
            <p className={styles.sectionDesc}>
              Visualize tooth instances and numbering for faster interpretation and consistent results.
            </p>
          </div>

          <div className={styles.featureMedia}>
            <img className={styles.featureImg} src="/assets/pano.png" alt="Panoramic X-ray segmentation" />
            <div className={styles.featureFooter}>
              <span className={styles.pillRed}>Red: Instance boundary</span>
              <span className={styles.pillGreen}>Green: Tooth labeling</span>
              <span className={styles.pillNeutral}>Export-ready results</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}