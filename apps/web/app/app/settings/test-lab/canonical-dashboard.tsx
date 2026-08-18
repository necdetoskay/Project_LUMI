import Link from "next/link";

import type {
  CanonicalTestLabDashboardData,
  CanonicalTestLabEvaluationView,
  CanonicalTestLabQualityMetric,
  CanonicalTestLabRunView,
} from "@/lib/ai/test-lab-dashboard-view-model";

import styles from "./canonical-dashboard.module.css";

const testItems = [
  "Hikaye Bütünlüğü",
  "Merak Uyandırma",
  "Yaşa Uygunluk",
  "Prompt Tutarlılığı",
  "Uzun Dönem Süreklilik",
  "Provider Failover",
  "Görsel Prompt Kalitesi",
];

function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string | undefined;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

function Sidebar() {
  const nav = [
    ["dashboard", "Dashboard"],
    ["person", "Karakter Onboarding"],
    ["menu_book", "Hikayeler"],
    ["image", "Görsel Kütüphanesi"],
    ["science", "Test Lab"],
  ] as const;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          ✣
        </span>
        <span className={styles.brandCopy}>
          <span>PROJECT</span>
          <strong>LUMI</strong>
        </span>
      </div>

      <nav className={styles.sidebarNav} aria-label="Test Lab navigasyonu">
        {nav.map(([icon, label]) => {
          const active = label === "Test Lab";
          return (
            <div
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              key={label}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </div>
          );
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.teamCard}>
          <span className={styles.teamAvatar}>L</span>
          <span className={styles.teamText}>
            <strong>LUMI Ekibi</strong>
            <small>Pro Plan</small>
          </span>
          <Icon name="expand_more" />
        </div>
        <Link className={styles.logoutLink} href="/app/settings">
          <Icon name="logout" />
          <span>Çıkış Yap</span>
        </Link>
      </div>
    </aside>
  );
}

function KpiCard({
  icon,
  accent,
  label,
  children,
  footnote,
}: {
  icon: string;
  accent: "purple" | "green" | "blue" | "orange";
  label: string;
  children: React.ReactNode;
  footnote: React.ReactNode;
}) {
  return (
    <article className={styles.kpiCard}>
      <span className={`${styles.kpiIcon} ${styles[`kpiIcon_${accent}`]}`}>
        <Icon name={icon} />
      </span>
      <div className={styles.kpiBody}>
        <p className={styles.kpiLabel}>{label}</p>
        <div className={styles.kpiValue}>{children}</div>
        <div className={styles.kpiFootnote}>{footnote}</div>
      </div>
    </article>
  );
}

function PanelTitle({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.panelTitle}>
      <span className={styles.panelTitleIcon}>
        <Icon name={icon} />
      </span>
      <h2>{children}</h2>
    </div>
  );
}

function TestPlan() {
  return (
    <section className={`${styles.panel} ${styles.testPlan}`}>
      <PanelTitle icon="assignment">Test Planı</PanelTitle>
      <p className={styles.panelSubtitle}>Değerlendirilecek testleri seçin.</p>
      <div className={styles.checkList}>
        {testItems.map((item) => (
          <label className={styles.checkRow} key={item}>
            <input type="checkbox" defaultChecked />
            <span>{item}</span>
            <Icon name="info" />
          </label>
        ))}
      </div>
      <div className={styles.panelFooterLine}>
        <button type="button">Tümünü Seç</button>
        <span>7 / 7 seçildi</span>
      </div>
    </section>
  );
}

function StepperControl({ value }: { value: string }) {
  return (
    <div className={styles.stepperControl}>
      <button type="button" aria-label="Azalt">
        −
      </button>
      <span>{value}</span>
      <button type="button" aria-label="Artır">
        +
      </button>
    </div>
  );
}

function ModelSettings({
  latestRun,
}: {
  latestRun: CanonicalTestLabRunView | null;
}) {
  return (
    <section className={`${styles.panel} ${styles.modelPanel}`}>
      <PanelTitle icon="settings">Model ve Çalıştırma Ayarları</PanelTitle>
      <label className={styles.fieldLabel}>
        Model
        <select defaultValue={latestRun?.model ?? "no-run"}>
          <option value={latestRun?.model ?? "no-run"}>
            {latestRun?.model ?? "Henüz koşu yok"}
          </option>
        </select>
      </label>
      <div className={styles.settingsGrid}>
        <label className={styles.fieldLabel}>
          Temperature
          <StepperControl value="0.7" />
        </label>
        <label className={styles.fieldLabel}>
          Max Output Tokens
          <StepperControl value="4096" />
        </label>
        <label className={styles.fieldLabel}>
          Örnek (Sample) Sayısı
          <StepperControl value="5" />
        </label>
        <label className={styles.toggleField}>
          <span>Otomatik Prompt İyileştir</span>
          <input type="checkbox" defaultChecked />
          <span className={styles.toggleTrack} aria-hidden="true" />
        </label>
      </div>
    </section>
  );
}

function LiveRunPanel({
  latestRun,
  evaluation,
}: {
  latestRun: CanonicalTestLabRunView | null;
  evaluation: CanonicalTestLabEvaluationView;
}) {
  const hasRun = latestRun !== null;
  const evaluationReady = evaluation.ready;
  const steps = [
    ["Örnek üret", hasRun ? "100%" : "Queued", hasRun ? "done" : "queued"],
    [
      "Yargılayıcı model\ndeğerlendir",
      evaluationReady ? `${evaluation.progressPercent}%` : "Queued",
      evaluationReady ? "done" : "queued",
    ],
    [
      "Rubrik puanla",
      evaluationReady ? "100%" : "Queued",
      evaluationReady ? "done" : "queued",
    ],
    ["Promptu iyileştir", "UI-4", "queued"],
    ["Final raporu oluştur", "Queued", "queued"],
  ] as const;
  const trendGeometry = evaluation.trend.map((point, index, items) => {
    const x = 42 + (items.length <= 1 ? 0 : (474 * index) / (items.length - 1));
    const y = 102 - point.score * 0.86;
    return { x, y, ...point };
  });
  const trendPoints = trendGeometry
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const trendArea =
    trendGeometry.length === 0
      ? ""
      : `M${trendGeometry[0]?.x ?? 42} 102 L ${trendPoints} L ${trendGeometry.at(-1)?.x ?? 42} 102 Z`;

  return (
    <section className={`${styles.panel} ${styles.liveRunPanel}`}>
      <div className={styles.liveHeader}>
        <div>
          <div className={styles.liveTitleRow}>
            <h2>Canlı Koşu Durumu</h2>
            <span className={styles.runningBadge}>
              ●&nbsp;{" "}
              {evaluationReady ? "Evaluated" : (latestRun?.status ?? "Idle")}
            </span>
          </div>
          <p>
            {latestRun
              ? `Başlangıç: ${latestRun.createdAtLabel} • Süre: ${latestRun.duration}`
              : "Henüz sandbox koşusu yok."}
          </p>
        </div>
        <div className={styles.runId}>
          <span>
            {latestRun
              ? `${latestRun.scenarioLabel} • ${latestRun.phaseLabel}`
              : "Sandbox hazır"}
          </span>
        </div>
      </div>

      <div className={styles.stepper}>
        <div className={styles.stepperLine} />
        <div className={styles.stepperProgress} />
        {steps.map(([label, detail, state], index) => (
          <div className={styles.step} key={label}>
            <span
              className={`${styles.stepCircle} ${styles[`stepCircle_${state}`]}`}
            >
              {index + 1}
            </span>
            <strong>
              {label.split("\n").map((line) => (
                <span key={line}>{line}</span>
              ))}
            </strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <div className={styles.progressBox}>
        <div className={styles.progressStats}>
          <strong>İlerleme</strong>
          <div className={styles.progressLabels}>
            <span>Judge İlerlemesi</span>
            <b>{evaluation.totalCandidates}</b>
          </div>
          <div className={styles.progressTrack}>
            <span style={{ width: `${evaluation.progressPercent}%` }} />
          </div>
          <div className={styles.progressBottom}>
            <span>
              <b>{evaluation.evaluatedCandidates}</b> /{" "}
              {evaluation.totalCandidates} değerlendirildi
            </span>
            <b>%{evaluation.progressPercent}</b>
          </div>
        </div>
        <div className={styles.currentJudge}>
          <div>
            <span>Geçerli Adım: </span>
            <strong>
              {evaluationReady
                ? "Judge değerlendirmesi tamamlandı"
                : "Judge bekleniyor"}
            </strong>
          </div>
          <p>{evaluation.judgeModel ?? "Judge modeli bekleniyor"}</p>
          <span>
            {evaluation.rubricLabel
              ? evaluation.rubricLabel
              : "Advanced yüzeyinden judge değerlendirmesi başlatılabilir."}
          </span>
          <Icon name={evaluationReady ? "check_circle" : "schedule"} />
        </div>
      </div>

      <div className={styles.chartBox}>
        <div className={styles.chartArea}>
          <strong>Canlı Skor Trendi</strong>
          <svg
            className={styles.scoreChart}
            viewBox="0 0 560 120"
            role="img"
            aria-label="Canlı skor trendi"
          >
            <defs>
              <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6d32e8" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#6d32e8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className={styles.chartGrid}>
              <line x1="34" y1="16" x2="540" y2="16" />
              <line x1="34" y1="42" x2="540" y2="42" />
              <line x1="34" y1="68" x2="540" y2="68" />
              <line x1="34" y1="94" x2="540" y2="94" />
            </g>
            {trendGeometry.length > 0 ? (
              <>
                <path d={trendArea} fill="url(#scoreArea)" />
                <polyline className={styles.chartLine} points={trendPoints} />
                {trendGeometry.map((point) => (
                  <circle
                    key={`${point.label}:${point.score}`}
                    cx={point.x}
                    cy={point.y}
                    r="2.4"
                  />
                ))}
              </>
            ) : null}
          </svg>
          <div className={styles.chartAxis}>
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index}>{evaluation.trend[index]?.label ?? "—"}</span>
            ))}
          </div>
        </div>
        <div className={styles.currentScore}>
          <span>Güncel Skor</span>
          <div>
            <strong>{evaluation.overallScore ?? "—"}</strong>
            <small>/100</small>
          </div>
          <b>●&nbsp; {evaluation.scoreState}</b>
        </div>
      </div>
    </section>
  );
}

function QualityPanel({
  metrics,
}: {
  metrics: CanonicalTestLabQualityMetric[];
}) {
  return (
    <section className={`${styles.panel} ${styles.qualityPanel}`}>
      <PanelTitle icon="bar_chart">Kalite Boyutları</PanelTitle>
      <div className={styles.qualityList}>
        {metrics.map((metric) => (
          <div className={styles.qualityRow} key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <b>
                {metric.pending ? "—" : metric.score} <small>/100</small>
              </b>
            </div>
            <div className={styles.qualityTrack}>
              <span style={{ width: `${metric.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PromptSuggestion() {
  return (
    <section className={`${styles.panel} ${styles.promptPanel}`}>
      <PanelTitle icon="auto_awesome">Prompt İyileştirme Önerisi</PanelTitle>
      <span className={styles.aiBadge}>UI-4</span>
      <p>
        Prompt iyileştirme önerileri, değerlendirme sonuçları UI-3 ile
        bağlandıktan sonra immutable draft akışı üzerinden burada gösterilecek.
      </p>
      <button className={styles.promptDetails} type="button" disabled>
        <span>Örnek Prompt Değişiklikleri</span>
        <Icon name="expand_more" />
      </button>
      <button className={styles.applyPromptButton} type="button" disabled>
        <Icon name="construction" />
        Prompta Uygula
      </button>
    </section>
  );
}

function RecentRuns({ runs }: { runs: CanonicalTestLabRunView[] }) {
  return (
    <section className={`${styles.panel} ${styles.recentPanel}`}>
      <h2>Son Koşular</h2>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Test Adı ↓</th>
              <th>Model</th>
              <th>Skor</th>
              <th>Maliyet</th>
              <th>Süre</th>
              <th>Durum</th>
              <th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={`${run.name}:${run.model}`}>
                <td>{run.name}</td>
                <td>{run.model}</td>
                <td>
                  <strong>{run.score}</strong>
                  <span
                    className={
                      run.scoreState === "İyi"
                        ? styles.scoreGood
                        : run.scoreState === "Zayıf"
                          ? styles.scoreBad
                          : styles.scoreMedium
                    }
                  >
                    ● {run.scoreState}
                  </span>
                </td>
                <td>{run.cost}</td>
                <td>{run.duration}</td>
                <td>
                  <span
                    className={
                      run.status === "Failed"
                        ? styles.statusRunning
                        : styles.statusCompleted
                    }
                  >
                    <Icon name={run.status === "Failed" ? "error" : "check"} />
                    {run.status}
                  </span>
                </td>
                <td>
                  <Icon name="more_vert" />
                </td>
              </tr>
            ))}
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7}>Henüz kayıtlı Test Lab koşusu yok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CanonicalTestLabDashboard({
  data,
}: {
  data: CanonicalTestLabDashboardData;
}) {
  const latestRun = data.latestRun;
  return (
    <div
      className={styles.viewportShell}
      data-testid="canonical-test-lab-dashboard"
    >
      <Sidebar />
      <main className={styles.dashboardMain}>
        <header className={styles.pageHeader}>
          <div>
            <h1>Test Lab</h1>
            <p>Hikaye üretim kalitesini ölç, karşılaştır ve geliştir.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.runAllButton} type="button">
              <Icon name="play_arrow" />
              Tüm Testleri Çalıştır
            </button>
            <button className={styles.reportButton} type="button">
              <Icon name="description" />
              Rapor Oluştur
            </button>
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Bildirimler"
            >
              <Icon name="notifications" />
              <span className={styles.notificationBadge}>3</span>
            </button>
          </div>
          <Icon name="help" className={styles.helpIcon} />
        </header>

        <section className={styles.kpiGrid} aria-label="Test Lab özeti">
          <KpiCard
            icon="account_tree"
            accent="purple"
            label="Aktif Suite"
            footnote={<>Son koşu: {latestRun?.createdAtLabel ?? "Henüz yok"}</>}
          >
            <strong className={styles.kpiTextValue}>LUMI Çekirdek Suite</strong>
            <span className={styles.versionBadge}>
              {latestRun ? "Live" : "Hazır"}
            </span>
          </KpiCard>
          <KpiCard
            icon="monitoring"
            accent="green"
            label="Son Koşu Skoru"
            footnote={
              <>
                <span className={styles.goodDot}>
                  ● {data.evaluation.scoreState}
                </span>
                <span>{latestRun?.createdAtLabel ?? "Değerlendirme yok"}</span>
              </>
            }
          >
            <strong className={styles.kpiScoreGood}>
              {data.evaluation.overallScore ?? "—"}
            </strong>
            <span>/ 100</span>
          </KpiCard>
          <KpiCard
            icon="check"
            accent="blue"
            label="Başarılı Test"
            footnote={<>Judge değerlendirmesi tamamlanan koşular</>}
          >
            <strong className={styles.kpiScoreBlue}>
              {data.evaluation.successfulRuns}
            </strong>
            <span>/ {data.evaluation.evaluatedRuns}</span>
          </KpiCard>
          <KpiCard
            icon="attach_money"
            accent="orange"
            label="Tahmini Maliyet"
            footnote={<>Bu koşu için tahmini</>}
          >
            <strong className={styles.kpiMoney}>
              {latestRun?.cost ?? "—"}
            </strong>
          </KpiCard>
        </section>

        <section className={styles.workspaceGrid}>
          <div className={styles.leftColumn}>
            <TestPlan />
            <ModelSettings latestRun={latestRun} />
          </div>
          <LiveRunPanel latestRun={latestRun} evaluation={data.evaluation} />
          <div className={styles.rightColumn}>
            <QualityPanel metrics={data.evaluation.qualityMetrics} />
            <PromptSuggestion />
          </div>
        </section>

        <RecentRuns runs={data.recentRuns} />

        <Link
          className={styles.advancedLink}
          href="/app/settings/test-lab/advanced"
        >
          Advanced / Developer
        </Link>
      </main>
    </div>
  );
}
