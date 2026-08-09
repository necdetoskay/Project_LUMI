import Link from "next/link";

import { StorybookBackdrop } from "@/components/public/storybook-shell";

export default function HomePage() {
  return (
    <section className="storybook-page">
      <StorybookBackdrop />
      <div className="storybook-hero">
        <div className="storybook-hero-copy">
          <span className="storybook-kicker">Yaşayan hikâye evreni</span>
          <h1>Her dönüşte seni hatırlayan bir dünya.</h1>
          <p>
            LUMI, çocuğun seçimlerini, dostluklarını, keşiflerini ve yaşadığı
            önemli anları unutmayan etkileşimli hikâyeler kurar. Her macera tek
            başına anlamlıdır; dünya ise hikâyeler boyunca yaşamaya devam eder.
          </p>
          <div className="storybook-actions">
            <Link className="storybook-button" href="/register">
              Kendi evrenini başlat
              <span className="material-symbols-outlined" aria-hidden="true">
                auto_awesome
              </span>
            </Link>
            <Link className="storybook-button-secondary" href="/login">
              Hikâyeme dön
            </Link>
          </div>
        </div>

        <div
          className="storybook-hero-panel"
          aria-label="LUMI dünya önizlemesi"
        >
          <div className="storybook-hero-art" aria-hidden="true">
            <div
              className="storybook-cabin"
              style={{ left: "18%", bottom: "5.8rem" }}
            >
              <div className="storybook-cabin-window">✦</div>
            </div>
            <div
              className="storybook-moon"
              style={{ right: "12%", top: "12%" }}
            >
              ☾
            </div>
          </div>
          <p className="storybook-hero-caption">
            Bir gün evde başlayan hikâye, başka bir gün sisli bir ormanda veya
            keşfedilmemiş bir vadinin sınırında devam edebilir. LUMI dünyası
            çocuğun yaşadıklarıyla birlikte büyür.
          </p>
        </div>
      </div>

      <div className="storybook-feature-grid" aria-label="LUMI yaklaşımı">
        <article className="storybook-feature">
          <div className="storybook-feature-icon" aria-hidden="true">
            📖
          </div>
          <h2>Önce hikâye kalitesi</h2>
          <p>
            Görsel, ses ve etkileşim destekleyicidir. Asıl merkez tutarlı, merak
            uyandıran ve yaşa uygun hikâyedir.
          </p>
        </article>
        <article className="storybook-feature">
          <div className="storybook-feature-icon" aria-hidden="true">
            🧭
          </div>
          <h2>Hatırlayan bir dünya</h2>
          <p>
            Önemli anılar, ilişkiler, eşyalar ve keşifler sonraki hikâyelerde
            doğal biçimde yeniden anlam kazanabilir.
          </p>
        </article>
        <article className="storybook-feature">
          <div className="storybook-feature-icon" aria-hidden="true">
            🌿
          </div>
          <h2>Oyun değil, yaşayan anlatı</h2>
          <p>
            Puan tabloları ve oyun ilerleme göstergeleri yerine değişim;
            karakterlerin, anıların ve dünyanın davranışlarında hissedilir.
          </p>
        </article>
      </div>
    </section>
  );
}
