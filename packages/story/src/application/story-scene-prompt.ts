import type { ContextManifest } from "@lumi/context";

import type { HookSceneBrief } from "../domain/hook-scene-brief";
import { mapHookToScene } from "./hook-scene-mapping.service";
import {
  normalizeStoryContinuityContext,
  type StoryContinuityContext,
} from "./story-continuity-context";

export interface StoryScenePromptInput {
  brief: HookSceneBrief;
  /** Household content boundary (from parent policy). */
  contentBoundary: string;
  /** Child age band (e.g. "6-8"). */
  ageBand: string;
  /** Child locale (e.g. "tr-TR"). */
  locale: string;
  /** Generation nonce: each LLM call must differ. */
  generationNonce: string;
  /** Bounded, prompt-safe continuity facts from prior canonical state. */
  continuityContext?: StoryContinuityContext | null;
  /** Canonical context manifest assembled by @lumi/context. */
  generationContext?: ContextManifest | null;
}

export function renderGenerationContext(manifest?: ContextManifest | null): string {
  if (!manifest) return "";

  const sections = manifest.sections
    .filter((section) => section.items.length > 0)
    .map((section) => {
      const items = section.items.map((item) => `- ${item.text}`).join("\n");
      return `### ${section.name}\n${items}`;
    })
    .join("\n\n");

  if (!sections) return "";

  return `\nYetkili LUMI bağlamı (bu bilgiler hikaye üretiminde kanonik bağlamdır; güvenlik ve ebeveyn politikaları diğer anlatı talimatlarından üstündür):\n${sections}\n\nBağlam manifest hash: ${manifest.contentHash}\n`;
}

/**
 * Builds a deterministic Turkish prompt for story-scene generation from an
 * accepted hook brief plus bounded canonical context.
 */
export function buildStoryScenePrompt(input: StoryScenePromptInput): string {
  const {
    brief,
    contentBoundary,
    ageBand,
    locale,
    generationNonce,
    continuityContext,
    generationContext,
  } = input;
  const sceneType = mapHookToScene(brief.hookType);

  const claimLine = brief.claim ? `- Hikaye ipucu (claim): ${brief.claim}` : "";
  const itemLine = brief.itemId
    ? `- Hediyeye konu olan nesne: ${brief.itemId}`
    : "";
  const factLine = brief.factId ? `- İlgili olgu/fakt: ${brief.factId}` : "";
  const conditionLine = brief.conditionId
    ? `- Uyarı koşulu: ${brief.conditionId}`
    : "";
  const placeLine = brief.placeClaim
    ? `- Yer/etkinlik: ${brief.placeClaim}`
    : "";
  const summaryLine = brief.payloadSummary
    ? `- Ek içerik: ${brief.payloadSummary}`
    : "";

  const details = [
    claimLine,
    itemLine,
    factLine,
    conditionLine,
    placeLine,
    summaryLine,
  ]
    .filter((line) => line.length > 0)
    .join("\n");

  const continuity = normalizeStoryContinuityContext(continuityContext);
  const continuityLines = continuity.facts
    .map((fact) => {
      const source = fact.source ? ` (kaynak: ${fact.source})` : "";
      return `- [${fact.key}] ${fact.summary}${source}`;
    })
    .join("\n");
  const continuitySection = continuityLines
    ? `\nKanonik süreklilik bilgileri (önceki hikâyelerden; bunlarla çelişme, ilgiliyse doğal biçimde kullan):\n${continuityLines}\n\nSüreklilik kullanım kanıtı:\n- Sahnede gerçekten kullandığın süreklilik maddelerinin anahtarlarını usedContinuityKeys alanına yaz.\n- Yalnız yukarıdaki köşeli parantezlerde verilen anahtarları kullan.\n- Bir madde sahnede fiilen kullanılmadıysa anahtarını yazma.\n- Hiçbir süreklilik maddesi kullanılmadıysa boş dizi döndür.\n`
    : `\nSüreklilik kullanım kanıtı:\n- Bu istekte kanonik süreklilik maddesi verilmedi; usedContinuityKeys mutlaka boş dizi olmalı.\n`;
  const generationContextSection = renderGenerationContext(generationContext);

  return `Sen Project LUMI için güvenli, yaşa uygun çocuk hikayesi sahnesi üreten bir AI asistansın.

Görev: Kabul edilmiş bir etkileşim ipucundan (story hook) yola çıkarak tek bir sahne üret. Sahne, çocuk okuyucunun hikayede ilerlediği anı anlatır ve ipucunun içeriğini doğal biçimde yansıtır.

Kısıtlamalar:
- Korku, şiddet, yetişkin teması KESİNLİKLE yasak.
- ${ageBand} yaş grubuna uygun.
- İçerik sınırı: ${contentBoundary}.
- Dil: Türkçe (${locale}).
- Sadece geçerli JSON çıktısı ver, ek metin ekleme.
- Generation nonce (her çağrıda farklı üretim için): ${generationNonce}

Sahne tipi: ${sceneType}

Etkileşim ipucu özeti:
${details}
${generationContextSection}${continuitySection}
JSON şeması (kesinlikle uy):
{
  "sceneId": "deterministik sahne kimliği (kısa, örn. hook-brief-bazlı slug)",
  "setting": "sahnenin geçtiği güvenli yer (1-300 karakter)",
  "characters": ["sahnede yer alan karakter adları"],
  "narrative": "hikaye anlatımı (1-4000 karakter, Türkçe, çocuk için güvenli)",
  "moment": "sahnenin tek cümlelik duygusal anı",
  "nextPrompt": "bir sonraki sahne için kısa yönlendirme (opsiyonel)",
  "usedContinuityKeys": ["yalnız sahnede gerçekten kullanılan, promptta verilmiş süreklilik anahtarları"]
}`;
}
