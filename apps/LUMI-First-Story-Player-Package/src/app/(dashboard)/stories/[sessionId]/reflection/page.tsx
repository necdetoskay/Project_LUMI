"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReflectionPage() {
  const router = useRouter();
  const [reflection, setReflection] =
    useState("");

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border bg-background p-8">
      <h1 className="text-2xl font-semibold">
        Bu macera sana ne düşündürdü?
      </h1>
      <p className="mt-2 text-muted-foreground">
        İstersen sevdiğin bölümü, verdiğin kararı veya bir sonraki macerada görmek istediğin şeyi yaz.
      </p>

      <textarea
        value={reflection}
        onChange={(event) =>
          setReflection(event.target.value)
        }
        className="mt-6 min-h-40 w-full rounded-lg border p-3"
        placeholder="En çok..."
      />

      <button
        type="button"
        onClick={() => router.push("/stories/history")}
        className="mt-6 min-h-11 rounded-lg bg-primary px-5 font-medium text-primary-foreground"
      >
        Hikâyeyi kaydet
      </button>
    </section>
  );
}
