import type {
  EvaluationCriterion,
  EvaluationFinding,
} from "@lumi/ai/test-lab";

export type PromptImprovementPlan = {
  targetCriterionKey: string;
  targetCriterionLabel: string;
  targetScore: number;
  recommendation: string;
  detailLines: string[];
  preserveCriteria: string[];
  promptInstructionBlock: string;
};

const ADVICE: Record<string, string> = {
  creativity:
    "Tekrarlanan veya jenerik sahne kalıplarını azalt; beklenmedik ama dünya kurallarıyla uyumlu somut ayrıntılar ekle.",
  engagement:
    "Her bölümde çocuğun dikkatini taşıyan net bir amaç, küçük gerilim ve görünür ilerleme oluştur.",
  curiosity:
    "Merak boşluğu oluştur: erken bir gizem tohumu ekle, cevabı hemen verme ve bölüm sonlarında doğal bir sonraki-keşif dürtüsü bırak.",
  age_suitability:
    "Dil, cümle uzunluğu, tema yoğunluğu ve problem çözme karmaşıklığını hedef yaş bandına daha sıkı bağla.",
  emotional_resonance:
    "Karakterin duygusunu eylem, kısa diyalog ve anlaşılır neden-sonuçlarla görünür kıl; açıklayıcı anlatımı azalt.",
  character_fidelity:
    "Karakterin bilinen motivasyonlarını, sesini ve geçmiş seçimlerini sahne kararlarına açıkça bağla; kişiliğe aykırı davranışları gerekçesiz üretme.",
  world_consistency:
    "Yerleşik dünya gerçeklerini, kuralları ve konum ilişkilerini üretim öncesi kısıt olarak yeniden doğrula; yeni bilgi eklerken çelişki yaratma.",
  continuity:
    "Önceki seçili olayları, açık hikâye uçlarını ve state değişikliklerini yeni sahnenin neden-sonuç zincirinde kullan.",
  pacing:
    "Sahne başına tek ana dramatik işlev kullan; gereksiz tekrarları kısalt ve önemli anlara yeterli alan bırak.",
  originality:
    "Önceki LUMI çıktılarındaki tekrar eden motifleri yeniden kullanmak yerine yeni ama karakter/dünya uyumlu sahne mekanikleri üret.",
  ending:
    "Bölümün ana mikro-hedefini kapat; geleceğe açık kapı bırakırken mevcut sahneyi yarım bırakılmış hissinden kaçındır.",
  future_story_potential:
    "Zoraki cliffhanger yerine dünyada doğal olarak takip edilebilecek bir ilişki, soru, nesne veya sonuç tohumu bırak.",
};

export function buildPromptImprovementPlan(input: {
  findings: EvaluationFinding[];
  criteria: EvaluationCriterion[];
}): PromptImprovementPlan | null {
  const criteriaByKey = new Map(
    input.criteria.map((criterion) => [criterion.key, criterion]),
  );
  const scored = input.findings
    .map((finding) => {
      const criterion = criteriaByKey.get(finding.criterionKey);
      if (!criterion) return null;
      return {
        finding,
        criterion,
        normalizedScore: normalizeCriterionScore(finding.score, criterion),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.normalizedScore - b.normalizedScore);

  const weakest = scored[0];
  if (!weakest) return null;

  const preserveCriteria = scored
    .filter((entry) => entry.normalizedScore >= 80)
    .slice(0, 4)
    .map((entry) => entry.criterion.label);

  const advice =
    ADVICE[weakest.criterion.key] ??
    `“${weakest.criterion.label}” kriterini güçlendirmek için judge bulgusunu doğrudan üretim kısıtına dönüştür.`;
  const finding = weakest.finding.finding.trim();
  const evidence = weakest.finding.evidence?.trim() ?? "";
  const preserveText =
    preserveCriteria.length > 0
      ? preserveCriteria.join(", ")
      : "mevcut güçlü kalite boyutları";

  const recommendation = `${weakest.criterion.label} en zayıf boyut. ${advice}`;
  const detailLines = [
    `Judge bulgusu: ${finding || "Somut bulgu kaydı yok."}`,
    evidence ? `Kanıt: ${evidence}` : "Kanıt: ayrıca belirtilmemiş.",
    `Korunacak güçlü alanlar: ${preserveText}.`,
  ];

  return {
    targetCriterionKey: weakest.criterion.key,
    targetCriterionLabel: weakest.criterion.label,
    targetScore: Math.round(weakest.normalizedScore),
    recommendation,
    detailLines,
    preserveCriteria,
    promptInstructionBlock: buildPromptInstructionBlock({
      targetLabel: weakest.criterion.label,
      advice,
      finding,
      preserveText,
    }),
  };
}

export function appendPromptImprovementBlock(
  userTemplate: string,
  instructionBlock: string,
): string {
  const stripped = userTemplate
    .replace(
      /\n*\[LUMI_TEST_LAB_OPTIMIZATION_V1\][\s\S]*?\[\/LUMI_TEST_LAB_OPTIMIZATION_V1\]\s*/g,
      "\n",
    )
    .trimEnd();
  return `${stripped}\n\n${instructionBlock}\n`;
}

function buildPromptInstructionBlock(input: {
  targetLabel: string;
  advice: string;
  finding: string;
  preserveText: string;
}): string {
  return [
    "[LUMI_TEST_LAB_OPTIMIZATION_V1]",
    `Öncelikli kalite hedefi: ${input.targetLabel}`,
    `Uygulama talimatı: ${input.advice}`,
    input.finding ? `Judge bulgusu: ${input.finding}` : null,
    `Koruma kısıtı: ${input.preserveText} alanlarını geriletme.`,
    "Bu talimatı çıktı şeması, güvenlik kuralları, yaş uygunluğu ve mevcut dünya/karakter gerçeklerinden daha yüksek öncelikte yorumlama.",
    "[/LUMI_TEST_LAB_OPTIMIZATION_V1]",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function normalizeCriterionScore(
  score: number,
  criterion: EvaluationCriterion,
): number {
  const span = criterion.maxScore - criterion.minScore;
  if (!Number.isFinite(score) || span <= 0) return 0;
  const ratio = (score - criterion.minScore) / span;
  return Math.max(0, Math.min(100, ratio * 100));
}
