import Image from "next/image";
import Link from "next/link";

import styles from "./landing-v2.module.css";

const features = [
  {
    icon: "face_6",
    title: "Kişiselleştirilmiş Kahramanlar",
    text: "Çocuğun yaşına, ilgilerine ve seçimlerine göre şekillenen benzersiz kahramanlar.",
  },
  {
    icon: "public",
    title: "Gelişen Dünyalar",
    text: "Hikâyeler boyunca değişen bölgeler, ilişkiler ve yeniden karşılaşılan tanıdık yüzler.",
  },
  {
    icon: "auto_stories",
    title: "Hikâye Devamlılığı",
    text: "Önemli anlar, dostluklar ve keşifler hatırlanır; yeni maceralar geçmişin üzerine kurulur.",
  },
  {
    icon: "collections_bookmark",
    title: "Zengin Görsel Dünya",
    text: "Karakter, dünya ve hikâye görselleri aynı büyülü dil içinde birbirini tamamlar.",
  },
] as const;

const stories = [
  {
    title: "Yıldız Toplayıcısı",
    subtitle: "Cesaret ve arkadaşlık üzerine gece yolculuğu",
    icon: "sailing",
    age: "4–8",
    tone: "night",
  },
  {
    title: "Fısıldayan Orman",
    subtitle: "Ormanın sırlarını çöz ve koruyucularla tanış",
    icon: "forest",
    age: "5–9",
    tone: "forest",
  },
  {
    title: "Bulut Adaları",
    subtitle: "Gökyüzündeki adalarda keşif dolu bir macera",
    icon: "cloud",
    age: "6–10",
    tone: "sky",
  },
  {
    title: "Kayıp Haritanın Peşinde",
    subtitle: "Efsanevi hazinenin izini sürmeye hazır mısın?",
    icon: "map",
    age: "6–10",
    tone: "map",
  },
] as const;

export default function HomePage() {
  return (
    <div className={`lumi-landing-v2 ${styles.landingPage}`}>
      <style>{`
        body:has(.lumi-landing-v2) {
          background: #05091d;
        }
        body:has(.lumi-landing-v2) > header,
        body:has(.lumi-landing-v2) > footer {
          display: none;
        }
        body:has(.lumi-landing-v2) > main {
          min-height: 100vh;
        }
      `}</style>
      <div className={styles.stars} aria-hidden="true" />
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="LUMI ana sayfa">
          <span className={styles.brandWord}>LUMI</span>
          <span className={styles.brandStar}>✦</span>
        </Link>

        <nav className={styles.nav} aria-label="Landing sayfası navigasyonu">
          <a href="#features">Nasıl Çalışır</a>
          <a href="#stories">Hikâyeler</a>
          <a href="#features">Dünyalar</a>
          <a href="#trust">Güvenlik</a>
        </nav>

        <Link className={styles.loginButton} href="/login">
          <span className="material-symbols-outlined" aria-hidden="true">
            person
          </span>
          Giriş Yap
        </Link>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="landing-title">
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Çocuğuna özel yaşayan maceralar</span>
            <h1 id="landing-title">
              Çocuğunuz için yaşayan bir <span>hikâye evreni</span>
            </h1>
            <p className={styles.heroLead}>
              LUMI; çocuğunuza özel kahramanlar, gelişen dünyalar ve birbiriyle
              bağ kuran güvenli hikâyelerle, her dönüşte biraz daha tanıdık hale
              gelen büyülü bir evren oluşturur.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/register">
                <span className="material-symbols-outlined" aria-hidden="true">
                  auto_awesome
                </span>
                Maceraya Başla
              </Link>
              <button
                className={styles.secondaryCta}
                type="button"
                disabled
                aria-label="Demo yakında"
                title="Yakında"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  play_circle
                </span>
                Demo Gör
                <small>Yakında</small>
              </button>
            </div>

            <div className={styles.trustPoints} aria-label="LUMI güven özellikleri">
              <span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  child_care
                </span>
                Çocuklar için tasarlandı
              </span>
              <span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified_user
                </span>
                Ebeveyn kontrollü
              </span>
              <span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  lock
                </span>
                Reklamsız ve güvenli
              </span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-label="LUMI hikâye evreni önizlemesi">
            <div className={styles.heroGlow} aria-hidden="true" />
            <Image
              className={styles.heroImage}
              src="/lumi-landing-scene.svg"
              alt="Harita, gemi, ejderha ve büyülü diyarlardan oluşan LUMI hikâye evreni"
              width={1200}
              height={900}
              priority
            />
            <div className={styles.heroBadge}>
              <span className="material-symbols-outlined" aria-hidden="true">
                explore
              </span>
              Her hikâye dünyada bir iz bırakır
            </div>
          </div>
        </section>

        <section className={styles.features} id="features" aria-label="LUMI özellikleri">
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.title}>
              <div className={styles.featureIcon} aria-hidden="true">
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <div>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.storySection} id="stories">
          <div className={styles.sectionIntro}>
            <span className={styles.sectionSpark}>✦</span>
            <div>
              <span className={styles.kicker}>Keşfedilecek hikâyeler</span>
              <h2>Her kapının ardında başka bir macera</h2>
              <p>
                Ormanlardan gökyüzü adalarına, yıldızlı denizlerden eski
                haritalara kadar farklı tonlarda dünyalar çocuğunu bekliyor.
              </p>
            </div>
            <button className={styles.ghostButton} type="button" disabled title="Yakında">
              Tüm Hikâyeleri Gör
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
              <small>Yakında</small>
            </button>
          </div>

          <div className={styles.storyGrid}>
            {stories.map((story) => (
              <article
                className={`${styles.storyCard} ${styles[`storyTone_${story.tone}`]}`}
                key={story.title}
              >
                <div className={styles.storyArt} aria-hidden="true">
                  <span className="material-symbols-outlined">{story.icon}</span>
                  <i />
                </div>
                <div className={styles.storyCardBody}>
                  <span className={styles.ageBadge}>{story.age}</span>
                  <h3>{story.title}</h3>
                  <p>{story.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.trustBand} id="trust" aria-label="LUMI güven yaklaşımı">
          <div className={styles.trustShield} aria-hidden="true">
            <span className="material-symbols-outlined">shield_with_heart</span>
          </div>
          <div className={styles.trustHeading}>
            <span className={styles.kicker}>Aileler için tasarlandı</span>
            <h2>Hayal gücü özgür, sınırlar güvenli.</h2>
          </div>
          <div className={styles.trustQuote}>
            <p>
              “LUMI’nin merkezinde puan toplamak değil; çocuğun kendi hikâyesini
              güven içinde yaşaması ve dünyasının onu hatırlaması var.”
            </p>
            <span>LUMI ürün ilkesi</span>
          </div>
          <div className={styles.safetyMark}>
            <span className="material-symbols-outlined" aria-hidden="true">
              family_star
            </span>
            <strong>Ebeveyn odaklı</strong>
            <small>Güvenli hikâye deneyimi</small>
          </div>
        </section>
      </main>
    </div>
  );
}
