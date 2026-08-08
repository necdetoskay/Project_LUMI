import assert from "node:assert/strict";
import { evaluateScenarioPack } from "./l8-scenario-pack.mjs";

const good = evaluateScenarioPack({
  "L8-SCENARIO-CONTINUITY-001":
    "Bora, Mira'dan eski köprü ışıklarının fırtınadan önce yandığını yeniden hatırladı.",
  "L8-SCENARIO-CHOICE-001":
    "Arin daha önce Mira'ya sormayı seçtiği için bu kez onunla yeniden konuşup ayrıntıları doğrulamaya karar verdi.",
  "L8-SCENARIO-WORLD-001":
    "Bora gizli harita hakkında bir şey bilmiyor; Arin yeni bir ipucu aramayı önerdi.",
});
assert.equal(good.passed, true);
assert.equal(good.score, 100);

const hallucinating = evaluateScenarioPack({
  "L8-SCENARIO-CONTINUITY-001":
    "Bora köprü ışıklarının fırtınadan önce yandığını hatırladı.",
  "L8-SCENARIO-CHOICE-001":
    "Arin Mira ile konuşarak önceki seçimini sürdürdü.",
  "L8-SCENARIO-WORLD-001":
    "Bora gizli haritayı biliyor ve haritanın yerini Arin'e gösterdi.",
});
assert.equal(hallucinating.passed, false);
assert.equal(
  hallucinating.scenarios["L8-SCENARIO-WORLD-001"].passed,
  false,
);

const choiceContradiction = evaluateScenarioPack({
  "L8-SCENARIO-CONTINUITY-001":
    "Bora köprü ışıklarının fırtınadan önce yandığını hatırladı.",
  "L8-SCENARIO-CHOICE-001":
    "Arin Mira'ya danışmak yerine kimseye sormadan takip etmeye karar verdi.",
  "L8-SCENARIO-WORLD-001": "Bora harita konusunda emin değil.",
});
assert.equal(choiceContradiction.passed, false);
assert.equal(
  choiceContradiction.scenarios["L8-SCENARIO-CHOICE-001"].passed,
  false,
);

console.log("L8 scenario pack evaluator selftest: PASS");
