import { describe, expect, it } from "vitest";

import { callOpenRouter } from "@lumi/profiles/application";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  L8_SCENARIO_PACK,
  evaluateScenarioPack,
} from "../../../tooling/ultef/src/l8-scenario-pack.mjs";

const enabled = process.env.ULTEF_REAL_PROVIDER_ENABLED === "true";
const apiKey = process.env.OPENROUTER_API_KEY;
const modelId = process.env.ULTEF_REAL_PROVIDER_MODEL;
const ultefDescribe = enabled && apiKey && modelId ? describe : describe.skip;

const SYSTEM_PROMPT = [
  "Sen Project LUMI için 6-8 yaş çocuklara uygun kısa bir Türkçe hikâye sahnesi üreten yazarsın.",
  "Sana verilen kanonik geçmişi ve çocuğun önceki seçimini değiştirme veya tersine çevirme.",
  "Kanonik olarak bilinmeyen bir bilgiyi gerçekmiş gibi uydurma.",
  "Şiddet, tehdit, korkutucu yetişkin temaları veya cinsel içerik kullanma.",
  "Yalnızca hikâye düzyazısını döndür; açıklama, madde işareti veya markdown kullanma.",
].join(" ");

const LIVE_CASES = [
  {
    id: "L8-SCENARIO-CONTINUITY-001",
    prompt: [
      "Karakterler: Arin ve Bora.",
      "Kanonik geçmiş: Bora, Mira'dan eski köprünün ışıklarının fırtınadan önce yandığını duydu.",
      "Yeni sahne: Arin ve Bora eski köprünün yanına yeniden gelsin.",
      "Önceki söylentiyi doğal biçimde hatırlatan kısa bir sahne yaz.",
    ].join("\n"),
  },
  {
    id: "L8-SCENARIO-CHOICE-001",
    prompt: [
      "Karakterler: Arin ve Mira.",
      "Çocuğun önceki açık seçimi: Arin, köprü ışıkları hakkında Mira'ya sormayı seçti.",
      "Yeni sahne: Bu seçimin sonucunu sürdür. Arin'in hiç kimseye sormadan sessizce ışıkları takip etmeyi seçtiğini yazma.",
      "Mira ile konuşmanın hikâyeyi ilerlettiği kısa bir sahne yaz.",
    ].join("\n"),
  },
  {
    id: "L8-SCENARIO-WORLD-001",
    prompt: [
      "Karakterler: Arin ve Bora.",
      "Kanonik dünya sınırı: Gizli bir haritadan söz edilebilir ama Bora haritanın yerini bilmiyor, haritayı daha önce görmedi ve bu konuda doğrulanmış bilgiye sahip değil.",
      "Yeni sahne: Arin harita hakkında Bora'ya soru sorsun.",
      "Bora'nın bilmediğini koruyan ve yeni gerçek uydurmayan kısa bir sahne yaz.",
    ].join("\n"),
  },
] as const;

ultefDescribe("ULTEF L8-LIVE-SCENARIO-PACK-001", () => {
  it(
    "runs continuity, choice influence and world-consistency scenarios against one live provider",
    async () => {
      const scenario = createScenario({
        id: "L8-LIVE-SCENARIO-PACK-001",
        title: "Live provider passes the L8 core story-quality scenario pack",
        level: "L8",
        projectGate: "PX-LUMI-09",
        seed: "live-provider-nondeterministic-three-scenario-pack",
      });

      scenario.setup("Live provider", { model: modelId });
      scenario.setup("Scenario pack", L8_SCENARIO_PACK);

      const outputs: Record<string, string> = {};
      const metrics: Array<{
        scenarioId: string;
        latencyMs: number;
        promptTokens: number | null;
        completionTokens: number | null;
        totalTokens: number | null;
      }> = [];

      for (const liveCase of LIVE_CASES) {
        const startedAt = Date.now();
        const response = await callOpenRouter(apiKey!, {
          model: modelId!,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: liveCase.prompt },
          ],
          temperature: 0.2,
          maxTokens: 500,
        });
        const latencyMs = Date.now() - startedAt;
        outputs[liveCase.id] = response.content;
        metrics.push({
          scenarioId: liveCase.id,
          latencyMs,
          promptTokens: response.usage?.promptTokens ?? null,
          completionTokens: response.usage?.completionTokens ?? null,
          totalTokens: response.usage?.totalTokens ?? null,
        });
        scenario.event(
          "live.scenario.generated",
          `${liveCase.id}: ${response.content}`,
          {
            scenarioId: liveCase.id,
            modelId: response.model,
            narrative: response.content,
            latencyMs,
            usage: response.usage,
          },
        );
      }

      const evaluation = evaluateScenarioPack(outputs);
      for (const definition of L8_SCENARIO_PACK) {
        const result = evaluation.scenarios[definition.id];
        scenario.assert(
          `${definition.title} passes`,
          result.passed,
          true,
          result,
        );
      }
      scenario.assert(
        "All L8 core scenarios pass the hard quality gate",
        evaluation.passed,
        true,
        evaluation,
      );

      scenario.event(
        "live.scenario-pack.metrics",
        `Completed ${LIVE_CASES.length} live scenarios; quality score=${evaluation.score}/100.`,
        {
          modelId,
          evaluation,
          metrics,
          totalLatencyMs: metrics.reduce((sum, item) => sum + item.latencyMs, 0),
          totalTokens: metrics.reduce(
            (sum, item) => sum + (item.totalTokens ?? 0),
            0,
          ),
        },
      );

      const report = scenario.finish({
        result: evaluation.passed ? "PASS" : "FAIL",
        reason: evaluation.passed
          ? "The live provider preserved continuity, honored the prior child choice, and respected a canonical unknown-information boundary across the L8 core scenario pack."
          : "The live provider failed at least one L8 hard quality scenario: continuity recall, choice influence, or world consistency.",
      });
      await writeScenarioArtifacts(report, {
        environment: "live-openrouter-opt-in-l8-scenario-pack",
      });

      expect(report.result).toBe("PASS");
    },
    90_000,
  );
});
