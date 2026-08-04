import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex-grow flex flex-col justify-center overflow-hidden min-h-[calc(100vh-200px)]">
      <div className="max-w-[800px] mx-auto text-center space-y-8">
        <span className="font-eyebrow text-eyebrow uppercase text-primary font-bold tracking-widest">
          PROJECT LUMI
        </span>
        <h1
          className="font-headline-xl font-bold text-on-background tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", lineHeight: "1.1" }}
        >
          Yaşayan hikâyeler için ebeveyn alanı hazır.
        </h1>
        <p className="font-lead text-lead text-muted max-w-[600px] mx-auto leading-relaxed">
          Çocuklarınızın hayal dünyasını güvenli, eğitici ve sihirli bir
          dokunuşla şekillendirin. Gelişim takibi ve içerik yönetimi artık tek
          bir panelde.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            className="bg-primary text-on-primary w-full sm:w-auto px-8 py-[0.85rem] rounded-lg font-label-bold text-label-bold hover:bg-[#4c29cf] active:scale-95 transition-all shadow-sm"
            href="/register"
          >
            Ebeveyn hesabı oluştur
          </Link>
          <Link
            className="border border-border text-secondary w-full sm:w-auto px-8 py-[0.85rem] rounded-lg font-label-bold text-label-bold hover:bg-surface-container-low active:scale-95 transition-all"
            href="/login"
          >
            Giriş yap
          </Link>
        </div>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-surface border border-border p-8 rounded-[16px] space-y-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <h3 className="font-label-bold text-on-background">
              Kişiselleştirilmiş Akış
            </h3>
            <p className="text-on-surface-variant font-body text-sm">
              Çocuğunuzun yaşına ve ilgi alanlarına göre otomatik olarak
              optimize edilen hikaye kütüphanesi.
            </p>
          </div>
          <div className="bg-surface border border-border p-8 rounded-[16px] space-y-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">monitoring</span>
            </div>
            <h3 className="font-label-bold text-on-background">
              Gelişim Analizi
            </h3>
            <p className="text-on-surface-variant font-body text-sm">
              Kelime hazinesi ve duygusal zeka gelişimini takip eden gelişmiş
              veri analitiği araçları.
            </p>
          </div>
          <div className="bg-surface border border-border p-8 rounded-[16px] space-y-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 bg-tertiary-container/10 rounded-xl flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">security</span>
            </div>
            <h3 className="font-label-bold text-on-background">Tam Kontrol</h3>
            <p className="text-on-surface-variant font-body text-sm">
              Ekran süresi limitleri ve içerik filtreleme ile %100 güvenli bir
              dijital oyun alanı.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
