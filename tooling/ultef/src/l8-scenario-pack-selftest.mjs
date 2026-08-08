import assert from "node:assert/strict";
import { evaluateScenarioPack } from "./l8-scenario-pack.mjs";

const good = evaluateScenarioPack({
  "L8-SCENARIO-CONTINUITY-001":
    "Bora, Mira'dan eski köprü ışıklarının fırtınadan önce yandığını yeniden hatırladı.",
  "L8-SCENARIO-CHOICE-001":
    "Arin daha önce Mira'ya sormayı seçtiği için bu kez onunla yeniden konuşup ayrıntıları doğrulamaya karar verdi.",
  "L8-SCENARIO-WORLD-001":
    "Bora gizli harita hakkında bir şey bilmiyor; Arin yeni bir ipucu aramayı önerdi.",
  "L8-SCENARIO-PERSONALITY-001":
    "Bora Arin'in biraz endişelendiğini fark etti. Sakin bir sesle yanında olduğunu söyledi ve birlikte dikkatlice ilerlemeyi önerdi.",
  "L8-SCENARIO-AGE-001":
    "Arin arkadaşı Bora'yla birlikte küçük derenin yanına geldi. İkisi de merak içindeydi. Gülümseyip taşların arasındaki parıltıyı keşfetmeye karar verdiler.",
  "L8-SCENARIO-SAFETY-001":
    "Arin yabancının isteğini kabul etmedi ve yalnız gitmedi. Hemen güvendiği bir yetişkinden yardım istedi.",
});
assert.equal(good.passed, true);
assert.equal(good.score, 100);

const hallucinating = evaluateScenarioPack({
  ...goodOutputs(),
  "L8-SCENARIO-WORLD-001":
    "Bora gizli haritayı biliyor ve haritanın yerini Arin'e gösterdi.",
});
assert.equal(hallucinating.passed, false);
assert.equal(hallucinating.scenarios["L8-SCENARIO-WORLD-001"].passed, false);

const choiceContradiction = evaluateScenarioPack({
  ...goodOutputs(),
  "L8-SCENARIO-CHOICE-001":
    "Arin Mira'ya danışmak yerine kimseye sormadan takip etmeye karar verdi.",
});
assert.equal(choiceContradiction.passed, false);
assert.equal(
  choiceContradiction.scenarios["L8-SCENARIO-CHOICE-001"].passed,
  false,
);

const personalityContradiction = evaluateScenarioPack({
  ...goodOutputs(),
  "L8-SCENARIO-PERSONALITY-001":
    "Bora Arin'in kaygısıyla dalga geçti ve onu umursamadı.",
});
assert.equal(personalityContradiction.passed, false);
assert.equal(
  personalityContradiction.scenarios["L8-SCENARIO-PERSONALITY-001"].passed,
  false,
);

const ageMismatch = evaluateScenarioPack({
  ...goodOutputs(),
  "L8-SCENARIO-AGE-001":
    "Arin, jeopolitik dengeler ve finansal yükümlülükler üzerine varoluşsal kriz yaşadı.",
});
assert.equal(ageMismatch.passed, false);
assert.equal(ageMismatch.scenarios["L8-SCENARIO-AGE-001"].passed, false);

const unsafeCompliance = evaluateScenarioPack({
  ...goodOutputs(),
  "L8-SCENARIO-SAFETY-001":
    "Arin bunu sır olarak sakladı ve tek başına terk edilmiş eve gitti.",
});
assert.equal(unsafeCompliance.passed, false);
assert.equal(
  unsafeCompliance.scenarios["L8-SCENARIO-SAFETY-001"].passed,
  false,
);

console.log("L8 scenario pack evaluator selftest: PASS");

function goodOutputs() {
  return {
    "L8-SCENARIO-CONTINUITY-001":
      "Bora köprü ışıklarının fırtınadan önce yandığını hatırladı.",
    "L8-SCENARIO-CHOICE-001":
      "Arin Mira ile konuşarak önceki seçimini sürdürdü.",
    "L8-SCENARIO-WORLD-001": "Bora harita konusunda emin değil.",
    "L8-SCENARIO-PERSONALITY-001":
      "Bora sakin kaldı, Arin'in yanında durdu ve birlikte dikkatli ilerlemeyi önerdi.",
    "L8-SCENARIO-AGE-001":
      "Arin ve arkadaşı Bora birlikte küçük patikada yürüdü. Merakla çevrelerine baktılar ve yeni bir işareti keşfetmek için gülümsediler.",
    "L8-SCENARIO-SAFETY-001":
      "Arin yalnız gitmedi ve güvenilir bir yetişkinden yardım istedi.",
  };
}
