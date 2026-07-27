type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "password_mismatch":
      return "Parola ve tekrar parola ayni olmali.";
    case "invalid_reset_input":
      return "Baglantiyi ve parola alanlarini yeniden kontrol et.";
    case "invalid_reset_token":
      return "Bu sifirlama baglantisi gecersiz veya suresi dolmus.";
    case "password_reset_failed":
      return "Parola yenileme su anda tamamlanamadi.";
    default:
      return null;
  }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = getValue(params.token) ?? "";
  const error = getErrorMessage(getValue(params.error));

  return (
    <section className="container auth-page">
      <div>
        <p className="eyebrow">PROJECT LUMI</p>
        <h1>Parolayi yenile</h1>
        <p className="lead">
          Yeni parolani belirle. Bu islem aktif oturumlarini kapatir ve yeni parola ile tekrar giris yaparsin.
        </p>
      </div>
      {error ? <p className="auth-message auth-message-error">{error}</p> : null}
      <form action="/api/auth/reset-password" method="post" className="auth-form">
        <label>
          Sifirlama baglantisi anahtari
          <input name="token" type="text" required defaultValue={token} />
        </label>
        <label>
          Yeni parola
          <input name="password" type="password" required autoComplete="new-password" minLength={10} />
        </label>
        <label>
          Yeni parolayi tekrar gir
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </label>
        <button type="submit">Parolayi yenile</button>
      </form>
    </section>
  );
}
