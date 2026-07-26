"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const questions = [
  {
    id: "q1",
    text: "Lina haritayı bulduğunda hangi iki yolu seçebilirdi?",
  },
  {
    id: "q2",
    text: "Sen Lina'nın yerinde olsaydın hangi yolu seçerdin? Neden?",
  },
];

export default function StoryQuestionsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border bg-background p-8">
      <h1 className="text-2xl font-semibold">
        Hikâye soruları
      </h1>
      <p className="mt-2 text-muted-foreground">
        Hikâyeyi birlikte düşünelim.
      </p>

      <div className="mt-8 grid gap-6">
        {questions.map((question, index) => (
          <label key={question.id} className="grid gap-2">
            <span className="font-medium">
              {index + 1}. {question.text}
            </span>
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]:
                    event.target.value,
                }))
              }
              className="min-h-28 rounded-lg border p-3"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          router.push(
            "/stories/demo-session/reflection",
          )
        }
        className="mt-8 min-h-11 rounded-lg bg-primary px-5 font-medium text-primary-foreground"
      >
        Devam et
      </button>
    </section>
  );
}
