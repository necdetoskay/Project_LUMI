import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "invalid_email":
      return "Gecerli bir e-posta girmen gerekiyor.";
    case "rate_limited":
      return "Cok fazla deneme yapildi. Biraz sonra tekrar dene.";
    case "request_failed":
      return "Sifirleme istegi su anda tamamlanamadi.";
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
    <section className="container auth-page">
      <div>
        <p className="eyebrow">PROJECT LUMI</p>
        <h1>Sifremi unuttum</h1>
        <p className="lead">
          Hesabina bagli e-posta adresini gir. Parola yenileme akisini baslatalim.
        </p>
      </div>
      {error ? <p className="auth-message auth-message-error">{error}</p> : null}
      {success ? (
        <div className="auth-message auth-message-success">
          <p>Baglantin hazir. E-posta altyapisi baglanana kadar bu ortamda dev onizleme kullaniyoruz.</p>
          {previewToken ? (
            <p>
              Dev onizleme: <Link href={`/reset-password?token=${encodeURIComponent(previewToken)}`}>parolayi yenile</Link>
            </p>
          ) : null}
        </div>
      ) : null}
      <form action="/api/auth/forgot-password" method="post" className="auth-form">
        <label>
          E-posta
          <input name="email" type="email" required autoComplete="email" defaultValue={email} />
        </label>
        <button type="submit">Yenileme baglantisi hazirla</button>
      </form>
      <div className="auth-links">
        <Link href="/login">Giris ekranina don</Link>
      </div>
    </section>
  );
}
