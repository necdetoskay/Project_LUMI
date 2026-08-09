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
    case "password_mismatch":
      return "Parola ve tekrar parola aynı olmalı.";
    case "email_exists":
      return "Bu e-posta ile zaten bir hesap var.";
    case "invalid_register_input":
      return "Bilgileri yeniden kontrol edip tekrar dene.";
    case "rate_limited":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "register_failed":
      return "Hesap şu anda oluşturulamadı. Tekrar dene.";
    default:
      return null;
  }
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = getValue(params.email) ?? "";
  const error = getErrorMessage(getValue(params.error));

  return (
    <section className="storybook-page">
      <StorybookBackdrop />
      <div className="storybook-grid storybook-grid-auth">
        <StorybookCard
          eyebrow="İlk sayfa"
          title="Yeni bir evrenin kapısını aç"
          description="Önce ebeveyn hesabını oluştur. Sonraki adımlarda çocuk profili, ilgi alanları, karakteri ve yaşayacağı dünya birlikte şekillenecek."
          note={
            <p>
              Zaten hesabın var mı?{" "}
              <Link className="storybook-inline-link" href="/login">
                Hikâyene dön
              </Link>
            </p>
          }
        >
          {error ? (
            <div className="storybook-message storybook-message-error" role="alert">
              {error}
            </div>
          ) : null}
          <form
            className="storybook-form"
            action="/api/auth/register"
            method="post"
          >
            <div className="storybook-form-row">
              <div className="storybook-field">
                <label htmlFor="displayName">Ebeveyn adı</label>
                <input
                  className="storybook-input"
                  id="displayName"
                  name="displayName"
                  placeholder="Örn: Elif"
                  required
                  autoComplete="name"
                  minLength={2}
                />
              </div>
              <div className="storybook-field">
                <label htmlFor="email">E-posta</label>
                <input
                  className="storybook-input"
                  id="email"
                  name="email"
                  placeholder="e-posta@adresiniz.com"
                  required
                  autoComplete="email"
                  type="email"
                  defaultValue={email}
                />
              </div>
            </div>
            <div className="storybook-field">
              <label htmlFor="password">Şifre</label>
              <input
                className="storybook-input"
                id="password"
                minLength={10}
                name="password"
                placeholder="En az 10 karakter"
                required
                autoComplete="new-password"
                type="password"
              />
              <p className="storybook-field-help">
                Hesabını korumak için en az 10 karakter kullan.
              </p>
            </div>
            <div className="storybook-field">
              <label htmlFor="confirmPassword">Şifreyi tekrar et</label>
              <input
                className="storybook-input"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Şifreni tekrar gir"
                required
                autoComplete="new-password"
                minLength={10}
                type="password"
              />
            </div>
            <button className="storybook-button" type="submit">
              İlk adımı tamamla
              <span className="material-symbols-outlined" aria-hidden="true">
                auto_awesome
              </span>
            </button>
          </form>
        </StorybookCard>

        <StorybookScene
          kicker="Henüz hiçbir şey kesinleşmedi"
          title="Dünya çocuğunla birlikte büyüyecek"
          text="Bugün yalnızca hesabı açıyoruz. Karakter, aile, ilgi alanları, geçmiş ve keşfedilecek yerler sonraki adımlarda sade seçimlerle oluşacak; bütün hikâyeler baştan yazılmayacak."
          icon="🌱"
        />
      </div>
    </section>
  );
}
