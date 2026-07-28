import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid_credentials":
      return "E-posta veya parola eslesmedi.";
    case "invalid_login_input":
      return "Lutfen e-posta ve parolayi yeniden kontrol et.";
    case "rate_limited":
      return "Cok fazla deneme yapildi. Biraz sonra tekrar dene.";
    case "login_failed":
      return "Giris su anda tamamlanamadi. Tekrar dene.";
    default:
      return null;
  }
}

function getSuccessMessage(success: string | undefined) {
  switch (success) {
    case "signed_out":
      return "Cikis yaptin. Tekrar giris yapabilirsin.";
    case "password_reset":
      return "Parolan yenilendi. Yeni sifrenle giris yap.";
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
    <main className="flex-grow flex items-center justify-center pt-24 pb-section-block px-padding-inline relative overflow-hidden">
      <div className="auth-container w-full max-w-[40rem] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-8 md:p-12 z-10">
        <div className="mb-10 text-center">
          <span className="font-eyebrow text-eyebrow text-primary mb-2 block tracking-widest">PROJECT LUMI</span>
          <h1 className="font-headline-xl text-3xl md:text-[40px] text-on-background mb-4 leading-tight">Giriş yap</h1>
          <p className="font-lead text-lead text-secondary max-w-md mx-auto">
            LUMI evrenine geri dönmeye hazır mısın? Macera kaldığı yerden devam ediyor.
          </p>
        </div>
        {error ? (
          <div className="mb-6 bg-destructive-soft text-on-error-container p-4 rounded-xl flex items-center gap-3 border border-outline-variant">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-6 bg-success-soft text-on-secondary-fixed-variant p-4 rounded-xl flex items-center gap-3 border border-outline-variant">
            {success}
          </div>
        ) : null}
        <form className="flex flex-col gap-form-gap" action="/api/auth/login" method="post">
          <div className="flex flex-col gap-2">
            <label className="font-label-bold text-label-bold text-on-surface" htmlFor="email">E-posta Adresi</label>
            <input className="form-input font-body text-body text-on-background bg-surface border-outline-variant w-full" id="email" name="email" placeholder="ornek@lumi.com" required autoComplete="email" defaultValue={email} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="font-label-bold text-label-bold text-on-surface" htmlFor="password">Şifre</label>
              <Link className="font-label-bold text-label-bold text-primary hover:underline" href="/forgot-password">Şifremi unuttum</Link>
            </div>
            <div className="relative">
              <input className="form-input font-body text-body text-on-background bg-surface border-outline-variant w-full pr-10" id="password" name="password" placeholder="••••••••" required autoComplete="current-password" type="password" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface transition-colors" type="button" aria-label="Şifre görünürlüğü">
                <span className="material-symbols-outlined">visibility</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary-container" id="remember" name="rememberMe" type="checkbox" defaultChecked />
            <label className="font-body text-body text-secondary" htmlFor="remember">Beni hatırla</label>
          </div>
          <button className="mt-4 bg-primary text-on-primary py-[0.85rem] px-6 rounded-lg font-label-bold text-label-bold shadow-md hover:bg-[#4c29cf] active:scale-95 transition-all flex justify-center items-center gap-2" type="submit">
            Giriş yap
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="font-body text-body text-secondary">
            Hesabın yok mu?{" "}
            <Link className="font-label-bold text-label-bold text-primary hover:underline" href="/register">Kayıt ol</Link>
          </p>
        </div>
      </div>
    </main>
  );
}