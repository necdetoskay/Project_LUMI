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
    <section className="container auth-page">
      <div>
        <p className="eyebrow">PROJECT LUMI</p>
        <h1>Giris yap</h1>
        <p className="lead">Ebeveyn hesabinla LUMI calisma alanina don.</p>
      </div>
      {error ? <p className="auth-message auth-message-error">{error}</p> : null}
      {success ? <p className="auth-message auth-message-success">{success}</p> : null}
      <form action="/api/auth/login" method="post" className="auth-form">
        <label>
          E-posta
          <input name="email" type="email" required autoComplete="email" defaultValue={email} />
        </label>
        <label>
          Parola
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <label className="auth-checkbox">
          <input name="rememberMe" type="checkbox" value="true" defaultChecked />
          Beni hatirla
        </label>
        <button type="submit">Giris yap</button>
      </form>
      <div className="auth-links">
        <Link href="/forgot-password">Sifremi unuttum</Link>
        <p>
          Hesabin yok mu? <Link href="/register">Kayit ol</Link>
        </p>
      </div>
    </section>
  );
}
