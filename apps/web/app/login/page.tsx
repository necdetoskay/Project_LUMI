import Link from "next/link";
import { getTranslations } from "next-intl/server";

import styles from "./login-v2.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("login");
  const params = await searchParams;
  const email = getValue(params.email) ?? "";
  const errorCode = getValue(params.error);
  const successCode = getValue(params.success);

  const error =
    errorCode === "invalid_credentials"
      ? t("errors.invalidCredentials")
      : errorCode === "invalid_login_input"
        ? t("errors.invalidInput")
        : errorCode === "rate_limited"
          ? t("errors.rateLimited")
          : errorCode === "login_failed"
            ? t("errors.failed")
            : null;

  const success =
    successCode === "signed_out"
      ? t("success.signedOut")
      : successCode === "password_reset"
        ? t("success.passwordReset")
        : null;

  return (
    <section className={`lumi-login-v2 ${styles.page}`}>
      <style>{`
        body:has(.lumi-login-v2) { background: #020817; }
        body:has(.lumi-login-v2) > header,
        body:has(.lumi-login-v2) > footer { display: none; }
        body:has(.lumi-login-v2) > main { min-height: 100vh; }
      `}</style>

      <div className={styles.shell}>
        <div
          className={styles.scene}
          aria-hidden="true"
          data-testid="login-v2-scene"
        />

        <div className={styles.formWrap}>
          <div className={styles.card}>
            <Link className={styles.logo} href="/" aria-label="LUMI">
              LUMI<span>✦</span>
            </Link>

            <div className={styles.heading}>
              <h1>{t("sceneTitle")}</h1>
              <p>{t("cardDescription")}</p>
            </div>

            {error ? (
              <div
                className={`${styles.message} ${styles.error}`}
                role="alert"
              >
                {error}
              </div>
            ) : null}

            {success ? (
              <div
                className={`${styles.message} ${styles.success}`}
                role="status"
              >
                {success}
              </div>
            ) : null}

            <form
              className={styles.form}
              action="/api/auth/login"
              method="post"
            >
              <div className={styles.field}>
                <label htmlFor="email">{t("emailLabel")}</label>
                <div className={styles.inputWrap}>
                  <span
                    className={`material-symbols-outlined ${styles.inputIcon}`}
                    aria-hidden="true"
                  >
                    mail
                  </span>
                  <input
                    className={styles.input}
                    id="email"
                    name="email"
                    placeholder={t("emailPlaceholder")}
                    required
                    autoComplete="email"
                    type="email"
                    defaultValue={email}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHeader}>
                  <label htmlFor="password">{t("passwordLabel")}</label>
                  <Link href="/forgot-password">{t("forgotPassword")}</Link>
                </div>
                <div className={styles.inputWrap}>
                  <span
                    className={`material-symbols-outlined ${styles.inputIcon}`}
                    aria-hidden="true"
                  >
                    lock
                  </span>
                  <input
                    className={styles.input}
                    id="password"
                    name="password"
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    type="password"
                  />
                </div>
              </div>

              <div className={styles.rememberRow}>
                <label className={styles.remember} htmlFor="remember">
                  <input
                    id="remember"
                    name="rememberMe"
                    type="checkbox"
                    defaultChecked
                  />
                  {t("rememberMe")}
                </label>
              </div>

              <button className={styles.submit} type="submit">
                <span className="material-symbols-outlined" aria-hidden="true">
                  person
                </span>
                {t("submit")}
                <span aria-hidden="true">✦</span>
              </button>
            </form>

            <div className={styles.divider} aria-hidden="true">
              <span>•</span>
            </div>

            <Link className={styles.secondary} href="/register">
              <span aria-hidden="true">✦</span>
              {t("createParentAccount")}
            </Link>

            <p className={styles.trust}>
              <span className="material-symbols-outlined" aria-hidden="true">
                verified_user
              </span>
              {t("noUniverse")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
