import Link from "next/link";

import styles from "./landing-v2.module.css";

// Keep the approved first mockup as the landing page's single visual source of truth.
export default function HomePage() {
  return (
    <div className={`lumi-landing-v2 ${styles.page}`}>
      <style>{`
        body:has(.lumi-landing-v2) { background: #04091d; }
        body:has(.lumi-landing-v2) > header,
        body:has(.lumi-landing-v2) > footer { display: none; }
        body:has(.lumi-landing-v2) > main { min-height: 100vh; }
      `}</style>

      <main className={styles.stage} aria-label="LUMI ana sayfa">
        <Link
          className={`${styles.hitArea} ${styles.loginHit}`}
          href="/login"
          aria-label="Giriş Yap"
        >
          <span className={styles.srOnly}>Giriş Yap</span>
        </Link>

        <Link
          className={`${styles.hitArea} ${styles.startHit}`}
          href="/register"
          aria-label="Maceraya Başla"
        >
          <span className={styles.srOnly}>Maceraya Başla</span>
        </Link>
      </main>
    </div>
  );
}
