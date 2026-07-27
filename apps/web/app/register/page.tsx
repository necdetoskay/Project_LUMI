import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "password_mismatch":
      return "Parola ve tekrar parola ayni olmali.";
    case "email_exists":
      return "Bu e-posta ile zaten bir hesap var.";
    case "invalid_register_input":
      return "Bilgileri yeniden kontrol edip tekrar dene.";
    case "rate_limited":
      return "Cok fazla deneme yapildi. Biraz sonra tekrar dene.";
    case "register_failed":
      return "Hesap su anda olusturulamadi. Tekrar dene.";
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
    <section className="container auth-page">
      <div>
        <p className="eyebrow">PROJECT LUMI</p>
        <h1>Ebeveyn hesabi olustur</h1>
        <p className="lead">
          Ilk hesap, cocuk profili ve hikaye evreni akisinin sahibi olacak.
        </p>
      </div>
      {error ? <p className="auth-message auth-message-error">{error}</p> : null}
      <form action="/api/auth/register" method="post" className="auth-form">
        <label>
          Ad
          <input name="displayName" type="text" required autoComplete="name" minLength={2} />
        </label>
        <label>
          E-posta
          <input name="email" type="email" required autoComplete="email" defaultValue={email} />
        </label>
        <label>
          Parola
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </label>
        <label>
          Parolayi tekrar gir
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
          />
        </label>
        <button type="submit">Hesap olustur</button>
      </form>
      <div className="auth-links">
        <p>
          Hesabin var mi? <Link href="/login">Giris yap</Link>
        </p>
      </div>
    </section>
  );
}
