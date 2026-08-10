import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  StorybookBackdrop,
  StorybookCard,
  StorybookScene,
} from "@/components/public/storybook-shell";

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
    <section className="storybook-page">
      <StorybookBackdrop />
      <div className="storybook-grid storybook-grid-auth">
        <StorybookScene
          kicker={t("sceneKicker")}
          title={t("sceneTitle")}
          text={t("sceneText")}
          icon="🧭"
        />

        <StorybookCard
          eyebrow="Project LUMI"
          title={t("cardTitle")}
          description={t("cardDescription")}
          note={
            <p>
              {t("noUniverse")}{" "}
              <Link className="storybook-inline-link" href="/register">
                {t("createParentAccount")}
              </Link>
            </p>
          }
        >
          {error ? (
            <div
              className="storybook-message storybook-message-error"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          {success ? (
            <div
              className="storybook-message storybook-message-success"
              role="status"
            >
              {success}
            </div>
          ) : null}
          <form
            className="storybook-form"
            action="/api/auth/login"
            method="post"
          >
            <div className="storybook-field">
              <label htmlFor="email">{t("emailLabel")}</label>
              <input
                className="storybook-input"
                id="email"
                name="email"
                placeholder={t("emailPlaceholder")}
                required
                autoComplete="email"
                type="email"
                defaultValue={email}
              />
            </div>
            <div className="storybook-field">
              <div className="storybook-field-heading">
                <label htmlFor="password">{t("passwordLabel")}</label>
                <Link href="/forgot-password">{t("forgotPassword")}</Link>
              </div>
              <input
                className="storybook-input"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                type="password"
              />
            </div>
            <label className="storybook-check" htmlFor="remember">
              <input
                id="remember"
                name="rememberMe"
                type="checkbox"
                defaultChecked
              />
              {t("rememberMe")}
            </label>
            <button className="storybook-button" type="submit">
              {t("submit")}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>
        </StorybookCard>
      </div>
    </section>
  );
}
