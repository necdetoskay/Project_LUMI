"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChoiceCard } from "@/components/story/choice-card";
import { StoryNodeView } from "@/components/story/story-node-view";
import { apiRequest } from "@/lib/api/client";
import type {
  StoryChoice,
  StoryNode,
} from "@/lib/story/types";

const demoNodes: Record<string, StoryNode> = {
  start: {
    id: "11111111-1111-4111-8111-111111111111",
    nodeType: "choice",
    title: "Kayıp Işık Haritası",
    body:
      "Lina, Başlangıç Evi'nin tavan arasında parlayan eski bir harita buldu. Haritanın üzerinde iki yol görünüyordu: biri Yeşil Vadi'ye, diğeri sisli mağaraya uzanıyordu.",
    ambience: [
      "Tavan arasında hafif rüzgâr",
      "Kâğıt hışırtısı",
    ],
    choices: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        label: "Yeşil Vadi yolunu seç",
        hint: "Daha güvenli ve tanıdık bir yol.",
        consequencePreview:
          "Yeni bir dostla karşılaşma ihtimali",
        nextNodeId: "valley",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        label: "Sisli mağaraya git",
        hint: "Daha gizemli ve belirsiz bir yol.",
        consequencePreview:
          "Nadir bir eşya bulma ihtimali",
        nextNodeId: "cave",
      },
    ],
  },
  valley: {
    id: "44444444-4444-4444-8444-444444444444",
    nodeType: "ending",
    title: "Vadideki Mesaj",
    body:
      "Lina vadide yaşlı bir kaplumbağayla karşılaştı. Kaplumbağa ona haritanın aslında bir sonraki maceraya açılan anahtar olduğunu söyledi.",
  },
  cave: {
    id: "55555555-5555-4555-8555-555555555555",
    nodeType: "ending",
    title: "Mağaranın Işığı",
    body:
      "Mağaranın derinliklerinde Lina, karanlıkta parlayan küçük bir pusula buldu. Pusula yalnızca cesur kararlar verildiğinde yön gösteriyordu.",
  },
};

export default function StoryPlayerPage({
  params: _params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const router = useRouter();
  const [nodeKey, setNodeKey] = useState("start");
  const [pending, setPending] = useState(false);
  const node = demoNodes[nodeKey];

  async function selectChoice(choice: StoryChoice) {
    if (!node) return;

    setPending(true);

    try {
      await apiRequest(
        "/api/v1/story-sessions/demo-session/decisions",
        {
          method: "POST",
          body: JSON.stringify({
            nodeId: node.id,
            choiceId: choice.id,
            decisionSequence: 1,
          }),
        },
      );
    } catch {
      // Demo player UI akışını sürdürebilir.
    } finally {
      setPending(false);
    }

    if (choice.nextNodeId) {
      setNodeKey(choice.nextNodeId);
    }
  }

  if (!node) return null;

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <StoryNodeView node={node} />

      {node.choices?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {node.choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              disabled={pending}
              onSelect={selectChoice}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            router.push(
              "/stories/demo-session/questions",
            )
          }
          className="min-h-12 rounded-lg bg-primary px-6 font-medium text-primary-foreground"
        >
          Hikâyeyi tamamla
        </button>
      )}
    </section>
  );
}
