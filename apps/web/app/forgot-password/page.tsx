import Link from "next/link";

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
    <section className="container auth-page">
      <div>
        <p className="eyebrow">PROJECT LUMI</p>
        <h1>Şifremi unuttum</h1>
        <p className="lead">
          Hesabına bağlı e-posta adresini gir. Parola yenileme akışını
          başlatalım.
        </p>
      </div>
      {error ? (
        <p className="auth-message auth-message-error">{error}</p>
      ) : null}
      {success ? (
        <div className="auth-message auth-message-success">
          <p>
            Bağlantın hazır. E-posta altyapısı bağlanana kadar bu ortamda dev
            önizleme kullanıyoruz.
          </p>
          {previewToken ? (
            <p>
              Dev önizleme:{" "}
              <Link
                href={`/reset-password?token=${encodeURIComponent(previewToken)}`}
              >
                parolayı yenile
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
      <form
        action="/api/auth/forgot-password"
        method="post"
        className="auth-form"
      >
        <label>
          E-posta
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={email}
          />
        </label>
        <button type="submit">Yenileme bağlantısı hazırla</button>
      </form>
      <div className="auth-links">
        <Link href="/login">Giriş ekranına dön</Link>
      </div>
    </section>
  );
}
