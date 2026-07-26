"use client";

import type { StoryType } from "@/lib/story/types";

const options: Array<{
  value: StoryType;
  title: string;
  description: string;
}> = [
  {
    value: "interactive",
    title: "Etkileşimli Hikâye",
    description:
      "Hikâye sırasında seçimler yapın ve olayların yönünü değiştirin.",
  },
  {
    value: "static",
    title: "Tek Akışlı Hikâye",
    description:
      "Başından sonuna kesintisiz ilerleyen klasik hikâye deneyimi.",
  },
];

export function StoryTypeSelector({
  value,
  onChange,
}: {
  value: StoryType;
  onChange: (value: StoryType) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "rounded-xl border p-5 text-left transition",
              selected
                ? "border-primary bg-primary/5"
                : "hover:border-primary/40",
            ].join(" ")}
            aria-pressed={selected}
          >
            <h3 className="font-medium">{option.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
