import Link from "next/link";

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
    <main className="flex-grow flex items-center justify-center py-section-block px-padding-inline relative overflow-hidden">
      <div className="w-full max-w-[40rem] z-10">
        <div className="bg-surface border border-outline-variant rounded-xl p-8 md:p-12">
          <div className="text-center mb-10">
            <span className="font-eyebrow text-eyebrow text-primary tracking-widest uppercase mb-4 block">
              PROJECT LUMI
            </span>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-[clamp(28px,6vw,40px)] md:leading-[48px] text-on-background mb-4">
              Ebeveyn hesabı oluştur
            </h1>
            <p className="font-lead text-lead text-on-surface-variant">
              Çocuğunuzun hayal dünyasını keşfetmesine yardımcı olacak güvenli
              bir liman inşa edelim.
            </p>
          </div>
          {error ? (
            <div
              className="hidden bg-destructive-soft border border-error rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 mb-6"
              id="error-box"
            >
              <span className="material-symbols-outlined text-error">
                error
              </span>
              <div className="font-body text-body text-on-error-container">
                {error}
              </div>
            </div>
          ) : null}
          <form
            className="space-y-form-gap"
            action="/api/auth/register"
            method="post"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-form-gap">
              <div className="flex flex-col gap-2">
                <label
                  className="font-label-bold text-label-bold text-on-surface"
                  htmlFor="displayName"
                >
                  Ad
                </label>
                <input
                  className="w-full px-[0.9rem] py-[0.8rem] rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline-variant font-body text-body"
                  id="displayName"
                  name="displayName"
                  placeholder="Örn: Elif"
                  required
                  autoComplete="name"
                  minLength={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  className="font-label-bold text-label-bold text-on-surface"
                  htmlFor="email"
                >
                  E-posta
                </label>
                <input
                  className="w-full px-[0.9rem] py-[0.8rem] rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline-variant font-body text-body"
                  id="email"
                  name="email"
                  placeholder="e-posta@adresiniz.com"
                  required
                  autoComplete="email"
                  defaultValue={email}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="font-label-bold text-label-bold text-on-surface"
                htmlFor="password"
              >
                Şifre
              </label>
              <input
                className="w-full px-[0.9rem] py-[0.8rem] rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline-variant font-body text-body"
                id="password"
                minLength={10}
                name="password"
                placeholder="En az 10 karakter"
                required
                autoComplete="new-password"
                type="password"
              />
              <p className="text-[12px] text-muted mt-1">
                Şifreniz güvenliğiniz için en az 10 karakterden oluşmalıdır.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="font-label-bold text-label-bold text-on-surface"
                htmlFor="confirmPassword"
              >
                Şifre Tekrar
              </label>
              <input
                className="w-full px-[0.9rem] py-[0.8rem] rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline-variant font-body text-body"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Şifrenizi tekrar girin"
                required
                autoComplete="new-password"
                minLength={10}
                type="password"
              />
            </div>
            <div className="pt-4">
              <button
                className="w-full py-[0.85rem] bg-primary text-on-primary font-label-bold text-label-bold rounded-lg hover:bg-[#4c29cf] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                type="submit"
              >
                <span>Hesap Oluştur</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </form>
          <div className="mt-8 pt-8 border-t border-outline-variant text-center">
            <p className="font-body text-body text-on-surface-variant">
              Zaten bir hesabınız var mı?{" "}
              <Link
                className="text-primary font-label-bold hover:underline decoration-primary ml-1"
                href="/login"
              >
                Giriş yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
