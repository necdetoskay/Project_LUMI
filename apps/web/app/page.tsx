import Image from "next/image";
import Link from "next/link";

import styles from "./landing-v2.module.css";

const features = [
  {
    icon: "person",
    tone: "purple",
    title: "Kişisel karakterler",
    description:
      "Çocuğunuzun yarattığı karakterler hatırlar, öğrenir ve onunla bağ kurar.",
  },
  {
    icon: "public",
    tone: "blue",
    title: "Yaşayan bir dünya",
    description:
      "Dünya, seçimlere göre değişir; yeni bölgeler, olaylar ve sırlar ortaya çıkar.",
  },
  {
    icon: "favorite",
    tone: "teal",
    title: "Çocuğa uygun deneyim",
    description:
      "Yaşa uygun içerik, ebeveyn kontrolü ve güvenli bir dijital ortam.",
  },
] as const;

const storyCards = [
  {
    icon: "auto_stories",
    tone: "purple",
    title: "Hikâyeni Başlat",
    description:
      "Kendi karakterini yarat, dünyanı seç ve ilk adımını at. Her büyük macera küçük bir kıvılcımla başlar.",
    image: "/landing/card-story.webp",
    imageAlt: "Kozmik ışıklarla açılan büyülü kitap",
    href: "/register",
  },
  {
    icon: "explore",
    tone: "blue",
    title: "Keşfet & Yaşa",
    description:
      "Görevleri tamamla, dostluklar kur ve dünyanı şekillendir. Seçimlerin her şeyi değiştirir.",
    image: "/landing/card-explore.webp",
    imageAlt: "Ay ışığında büyülü kale şehri",
    href: "#worlds",
  },
  {
    icon: "park",
    tone: "teal",
    title: "Büyüt & Geliştir",
    description:
      "Dünya, hikâyelerinle büyür. Yeni yerler açılır, sırlar derinleşir ve maceran hiç bitmez.",
    image: "/landing/card-grow.webp",
    imageAlt: "Işıklarla aydınlanan büyülü ağaç ev",
    href: "#features",
  },
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

      <div className={styles.ambientBackdrop} aria-hidden="true">
        <span
          className={`${styles.ambientCorner} ${styles.cornerMechanical}`}
        />
        <span className={`${styles.ambientCorner} ${styles.cornerFantasy}`} />
        <span className={`${styles.ambientCorner} ${styles.cornerOcean}`} />
        <span className={`${styles.ambientCorner} ${styles.cornerAnimals}`} />
      </div>

      <header className={styles.navShell}>
        <nav className={styles.nav} aria-label="Ana navigasyon">
          <Link className={styles.brand} href="/" aria-label="LUMI ana sayfa">
            <span className={styles.brandMark} aria-hidden="true">
              ✦
            </span>
            <span className={styles.brandName}>LUMI</span>
          </Link>

          <div className={styles.navLinks}>
            <Link className={styles.navActive} href="/">
              Ana Sayfa
            </Link>
            <Link href="#worlds">Dünyalar</Link>
            <Link href="#features">Özellikler</Link>
            <Link href="#how-it-works">Nasıl Çalışır?</Link>
            <Link href="#about">Hakkımızda</Link>
            <Link href="#stories">Hikâyeler</Link>
          </div>

          <div className={styles.navActions}>
            <Link className={styles.secondaryButton} href="/login">
              Giriş Yap
            </Link>
            <Link className={styles.primaryButton} href="/register">
              <span aria-hidden="true">✧</span>
              Maceraya Başla
            </Link>
          </div>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} id="about">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Project LUMI</p>
            <h1 className={styles.heroTitle}>
              Her hikâye
              <br />
              bir <span>dünyaya</span> dönüşür.
            </h1>
            <p className={styles.heroLead}>
              LUMI, çocuğunuzun hayal gücüyle şekillenen kişisel hikâye
              dünyaları oluşturur. Hikâyeler yaşar, karakterler hatırlar ve
              dünya, her yeni macerayla birlikte gelişir.
            </p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButtonLarge} href="/register">
                <span aria-hidden="true">✧</span>
                Maceraya Başla
              </Link>
              <Link
                className={styles.secondaryButtonLarge}
                href="#how-it-works"
              >
                <span aria-hidden="true">▶</span>
                Nasıl Çalışır?
              </Link>
            </div>

            <div className={styles.trustRow} aria-label="LUMI güvenceleri">
              <span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified_user
                </span>
                Güvenli &amp; Gizli
              </span>
              <span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  favorite
                </span>
                %100 Çocuk Dostu
              </span>
              <span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  auto_awesome
                </span>
                Hayal Gücünü Geliştirir
              </span>
            </div>
          </div>

          <div className={styles.heroVisual} id="worlds">
            <Image
              className={styles.heroImage}
              src="/landing/hero-world.webp"
              width={1000}
              height={563}
              priority
              sizes="(max-width: 1080px) 94vw, 56vw"
              alt="Ay ışığında büyülü ağaç, ışıklı geçit ve yüzen masal şehri"
            />
            <Link
              className={styles.portalLink}
              href="/register"
              aria-label="Masal dünyasına gir"
            >
              <span className={styles.portalAura} aria-hidden="true" />
              <span className={styles.portalSpark} aria-hidden="true">
                ✦
              </span>
              <span className={styles.srOnly}>Masal dünyasına gir</span>
            </Link>
          </div>
        </section>

        <section
          className={styles.featureBand}
          id="how-it-works"
          aria-label="LUMI özellikleri"
        >
          {features.map((feature) => (
            <article className={styles.feature} key={feature.title}>
              <span
                className={`${styles.featureIcon} ${styles[feature.tone]}`}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">
                  {feature.icon}
                </span>
              </span>
              <div>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.storySection} id="features">
          <header className={styles.sectionHeader}>
            <h2>
              Bir hikâye biter. Dünya <span>devam eder.</span>
            </h2>
            <div className={styles.sectionSpark} aria-hidden="true">
              ✦
            </div>
          </header>

          <div className={styles.storyGrid} id="stories">
            {storyCards.map((card) => (
              <article className={styles.storyCard} key={card.title}>
                <div className={styles.storyCopy}>
                  <span
                    className={`${styles.storyIcon} ${styles[card.tone]}`}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">
                      {card.icon}
                    </span>
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <Link
                    className={styles.storyArrow}
                    href={card.href}
                    aria-label={`${card.title} bölümüne git`}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                </div>
                <div className={styles.storyImageWrap}>
                  <Image
                    className={styles.storyImage}
                    src={card.image}
                    width={500}
                    height={375}
                    sizes="(max-width: 760px) 92vw, 18vw"
                    alt={card.imageAlt}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
