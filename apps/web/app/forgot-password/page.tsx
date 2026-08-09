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
    case "invalid_email":
      return "Geçerli bir e-posta girmen gerekiyor.";
    case "rate_limited":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "request_failed":
      return "Sıfırlama isteği şu anda tamamlanamadı.";
    default:
      return null;
  }
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = getValue(params.email) ?? "";
  const previewToken = getValue(params.previewToken);
  const error = getErrorMessage(getValue(params.error));
  const success = getValue(params.success) === "reset_requested";

  return (
    <section className="storybook-page">
      <StorybookBackdrop />
      <div className="storybook-grid storybook-grid-auth">
        <StorybookScene
          kicker="Yolunu kaybetmedin"
          title="Hikâyene giden yolu yeniden bul"
          text="Şifreni unutmak dünyanı silmez. Hesabına bağlı e-posta adresini kullanarak giriş yolunu yeniden açabilirsin."
          icon="🕯️"
        />

        <StorybookCard
          eyebrow="Güvenli dönüş"
          title="Şifremi unuttum"
          description="Hesabına bağlı e-posta adresini gir. Parola yenileme akışını başlatalım."
          note={
            <Link className="storybook-inline-link" href="/login">
              Giriş ekranına dön
            </Link>
          }
        >
          {error ? (
            <div className="storybook-message storybook-message-error" role="alert">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="storybook-message storybook-message-success" role="status">
              <p>
                Bağlantın hazır. E-posta altyapısı bağlanana kadar bu ortamda
                geliştirme önizlemesi kullanılıyor.
              </p>
              {previewToken ? (
                <p>
                  <Link
                    className="storybook-inline-link"
                    href={`/reset-password?token=${encodeURIComponent(previewToken)}`}
                  >
                    Parolayı yenile
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
          <form
            action="/api/auth/forgot-password"
            method="post"
            className="storybook-form"
          >
            <div className="storybook-field">
              <label htmlFor="email">E-posta</label>
              <input
                className="storybook-input"
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={email}
                placeholder="e-posta@adresiniz.com"
              />
            </div>
            <button className="storybook-button" type="submit">
              Yenileme yolunu aç
              <span className="material-symbols-outlined" aria-hidden="true">
                key
              </span>
            </button>
          </form>
        </StorybookCard>
      </div>
    </section>
  );
}
