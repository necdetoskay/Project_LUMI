import assert from "node:assert/strict";
import {
  buildSemanticJudgePrompt,
  parseSemanticJudgeResponse,
} from "./l8-semantic-rubric.mjs";

const prompt = buildSemanticJudgePrompt({
  narratives: {
    choice: "Arin, daha önce Mira'ya sormayı seçtiği için onunla konuşmayı sürdürdü.",
    personality:
      "Arin gerilince Bora onunla alay etmedi; yanında kalıp sakin bir yol önerdi.",
    age: "Arin küçük tahta köprüye baktı. Bora gülümsedi. Birlikte güvenli bir yol düşündüler.",
  },
});
assert.ok(prompt.includes("choice_influence"));
assert.ok(prompt.includes("personality_emotion"));
assert.ok(prompt.includes("age_appropriateness"));

const parsed = parseSemanticJudgeResponse(
  JSON.stringify({
    scores: {
      choice_influence: { score: 5, reason: "The prior choice actively drives the scene." },
      personality_emotion: { score: 4, reason: "Bora remains supportive and calm." },
      age_appropriateness: { score: 5, reason: "The language is concrete and child-friendly." },
    },
  }),
);
assert.equal(parsed.meanScore, 4.67);
assert.equal(parsed.normalizedPercent, 93.33);

assert.throws(
  () =>
    parseSemanticJudgeResponse(
      JSON.stringify({
        scores: {
          choice_influence: { score: 6, reason: "out of range" },
          personality_emotion: { score: 4, reason: "ok" },
          age_appropriateness: { score: 4, reason: "ok" },
        },
      }),
    ),
  /Invalid semantic judge score/,
);

assert.throws(
  () => parseSemanticJudgeResponse("not-json"),
  /strict JSON/,
);

console.log("L8 semantic rubric selftest: PASS");
