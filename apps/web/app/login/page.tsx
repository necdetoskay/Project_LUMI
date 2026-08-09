import Link from "next/link";

import {
  StorybookBackdrop,
  StorybookCard,
  StorybookScene,
} from "@/components/public/storybook-shell";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid_credentials":
      return "E-posta veya parola eslesmedi.";
    case "invalid_login_input":
      return "Lütfen e-posta ve parolayı yeniden kontrol et.";
    case "rate_limited":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "login_failed":
      return "Giriş şu anda tamamlanamadı. Tekrar dene.";
    default:
      return null;
  }
}

function getSuccessMessage(success: string | undefined) {
  switch (success) {
    case "signed_out":
      return "Çıkış yaptın. Tekrar giriş yapabilirsin.";
    case "password_reset":
      return "Parolan yenilendi. Yeni şifrenle giriş yap.";
    default:
      return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = getValue(params.email) ?? "";
  const error = getErrorMessage(getValue(params.error));
  const success = getSuccessMessage(getValue(params.success));

  return (
    <section className="storybook-page">
      <StorybookBackdrop />
      <div className="storybook-grid storybook-grid-auth">
        <StorybookScene
          kicker="Kaldığın yer seni bekliyor"
          title="Dünyana geri dön"
          text="Son hikâyenin izleri, tanıştığın kişiler ve keşfettiğin yerler burada. Giriş yaptığında LUMI seni yeni bir başlangıca değil, kendi geçmişinin devamına götürür."
          icon="🧭"
        />

        <StorybookCard
          eyebrow="Project LUMI"
          title="Hikâyeme dön"
          description="Ebeveyn hesabınla giriş yap; profillerin ve yaşayan evrenlerin kaldığı yerden devam etsin."
          note={
            <p>
              Henüz bir evrenin yok mu?{" "}
              <Link className="storybook-inline-link" href="/register">
                Ebeveyn hesabı oluştur
              </Link>
            </p>
          }
        >
          {error ? (
            <div className="storybook-message storybook-message-error" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="storybook-message storybook-message-success" role="status">
              {success}
            </div>
          ) : null}
          <form className="storybook-form" action="/api/auth/login" method="post">
            <div className="storybook-field">
              <label htmlFor="email">E-posta adresi</label>
              <input
                className="storybook-input"
                id="email"
                name="email"
                placeholder="ornek@lumi.com"
                required
                autoComplete="email"
                type="email"
                defaultValue={email}
              />
            </div>
            <div className="storybook-field">
              <div className="storybook-field-heading">
                <label htmlFor="password">Şifre</label>
                <Link href="/forgot-password">Şifremi unuttum</Link>
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
              Bu cihazda beni hatırla
            </label>
            <button className="storybook-button" type="submit">
              Dünyama dön
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
