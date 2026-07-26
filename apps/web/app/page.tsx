export default function HomePage() {
  return (
    <section className="container" style={{ paddingBlock: "6rem" }}>
      <p style={{ color: "var(--primary)", fontWeight: 700 }}>PROJECT LUMI</p>
      <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", marginBlock: "1rem" }}>
        Yaşayan hikâyelerin temeli hazır.
      </h1>
      <p
        style={{ color: "var(--muted)", fontSize: "1.2rem", maxWidth: "44rem" }}
      >
        Bu ekran LUMI monorepo, web uygulaması ve geliştirme araç zincirinin
        başarıyla çalıştığını doğrular.
      </p>
    </section>
  );
}
