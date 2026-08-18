import Link from "next/link";

import styles from "./landing-v2.module.css";

const features = [
  ["hero", "Kişiselleştirilmiş Kahramanlar", "Çocuğunuzun özelliklerine, ilgilerine ve hayal gücüne göre benzersiz kahramanlar oluşturun."],
  ["world", "Gelişen Dünyalar", "Seçimlerinizle değişen canlı dünyalar, yeni karakterler ve sürpriz keşifler sizi bekliyor."],
  ["book", "Hikâye Devamlılığı", "Her hikâye hatırlanır, bağlantılar kurulur ve çocuğunuzla birlikte ilerleyen bir yolculuk oluşur."],
  ["treasure", "Zengin Görsel Kütüphane", "Büyüleyici illüstrasyonlar, seslendirmeler ve etkileşimli içeriklerle hikâyeler daha da canlı."],
] as const;

const stories = [
  ["night", "Yıldız Toplayıcısı", "Cesaret ve arkadaşlık üzerine eşsiz bir yolculuk.", "4–8"],
  ["forest", "Fısıldayan Orman", "Ormanın sırlarını çöz ve koruyucularla tanış.", "5–9"],
  ["sky", "Bulut Adaları", "Gökyüzündeki adalarda keşif dolu bir macera.", "6–10"],
  ["map", "Kayıp Haritanın Peşinde", "Efsanevi hazinenin izini sürmeye hazır mısın?", "6–10"],
] as const;

export default function HomePage() {
  return (
    <div className={`lumi-landing-v2 ${styles.page}`}>
      <style>{`
        body:has(.lumi-landing-v2) { background: #020718; }
        body:has(.lumi-landing-v2) > header,
        body:has(.lumi-landing-v2) > footer { display: none; }
        body:has(.lumi-landing-v2) > main { min-height: 100vh; }
      `}</style>

      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="LUMI ana sayfa">
          LUMI<span>✦</span>
        </Link>
        <nav className={styles.nav} aria-label="Ana navigasyon">
          <a href="#features">Nasıl Çalışır</a>
          <a href="#stories">Hikâyeler</a>
          <a href="#features">Dünyalar</a>
          <a href="#trust">Güvenlik</a>
        </nav>
        <Link className={styles.login} href="/login">
          <span className="material-symbols-outlined" aria-hidden="true">person</span>
          Giriş Yap
        </Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroArt} aria-hidden="true" />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <h1>
              Çocuğunuz için<br />
              yaşayan bir<br />
              <span>hikâye evreni</span>
            </h1>
            <p>
              LUMI, çocuğunuza özel kahramanlar, gelişen dünyalar ve akıcılığı olan
              hikâyelerle dolu, güvenli ve büyülü bir etkileşimli hikâye deneyimi sunar.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/register">
                <span aria-hidden="true">★</span> Maceraya Başla
              </Link>
              <button className={styles.secondary} type="button" disabled title="Yakında">
                <span className="material-symbols-outlined" aria-hidden="true">play_circle</span>
                Demo Gör
              </button>
            </div>
            <div className={styles.trustLine}>
              <span>☺ &nbsp; 4–10 yaş için tasarlandı</span>
              <span>♢ &nbsp; Ebeveyn onaylı</span>
              <span>▣ &nbsp; Reklamsız ve güvenli</span>
            </div>
          </div>
        </section>

        <section className={styles.features} id="features" aria-label="LUMI özellikleri">
          {features.map(([art, title, text]) => (
            <article className={styles.featureCard} key={title}>
              <div className={`${styles.featureArt} ${styles[`featureArt_${art}`]}`} aria-hidden="true" />
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.stories} id="stories">
          <div className={styles.storyIntro}>
            <h2><span>✦</span> Hikâyelere Göz At</h2>
            <p>Keşfedilecek birçok dünya ve unutulmaz macera seni bekliyor.</p>
            <button type="button" disabled title="Yakında">Tüm Hikâyeleri Gör →</button>
          </div>
          <div className={styles.storyGrid}>
            {stories.map(([tone, title, text, age]) => (
              <article className={styles.storyCard} key={title}>
                <div className={`${styles.storyArt} ${styles[`storyArt_${tone}`]}`} aria-hidden="true" />
                <div className={styles.storyBody}>
                  <span>{age}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
          <button className={styles.nextStory} type="button" disabled aria-label="Sonraki hikâye" title="Yakında">›</button>
        </section>

        <section className={styles.trustBand} id="trust">
          <div className={styles.trustTitle}><b>♡</b><strong>Ailelerin Güvendiği<br />Bir Hikâye Deneyimi</strong></div>
          <blockquote>“LUMI, çocuğumun hayal gücünü beslerken bana da içim rahat bir deneyim sunuyor.”<span>— Elif K., Anne &nbsp; ★★★★★</span></blockquote>
          <blockquote>“Hikâyeler kişiselleştikçe oğlumun kendini gerçekten içinde hissettiğini görüyorum.”<span>— Mert A., Baba &nbsp; ★★★★★</span></blockquote>
          <blockquote>“Güvenlik odaklı ve reklamsız olması bizim için en önemli tercih sebebimiz.”<span>— Yasemin T., Anne &nbsp; ★★★★★</span></blockquote>
          <div className={styles.safety}><b>♢</b><span>Çocuk Güvenliği<br /><strong>Önceliğimiz</strong></span></div>
        </section>
      </main>
    </div>
  );
}
