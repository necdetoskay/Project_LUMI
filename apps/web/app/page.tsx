import Link from "next/link";

export default function HomePage() {
  return (
    <section className="container" style={{ paddingBlock: "6rem" }}>
      <p style={{ color: "var(--primary)", fontWeight: 700 }}>PROJECT LUMI</p>
      <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", marginBlock: "1rem" }}>
        Yaşayan hikâyeler için ebeveyn alanı hazır.
      </h1>
      <p
        style={{ color: "var(--muted)", fontSize: "1.2rem", maxWidth: "44rem" }}
      >
        İlk hesabını oluştur, sonra LUMI çalışma alanına giriş yaparak çocuk
        profilleri ve hikaye evreni akışına devam et.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "2rem" }}>
        <Link className="button-link" href="/register">
          Ebeveyn hesabı oluştur
        </Link>
        <Link className="button-link button-link-secondary" href="/login">
          Giriş yap
        </Link>
      </div>
    </section>
  );
}
