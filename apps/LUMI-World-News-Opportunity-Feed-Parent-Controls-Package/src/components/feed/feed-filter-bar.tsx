"use client";

export type FeedFilterValue =
  | "all"
  | "unread"
  | "urgent"
  | "opportunities"
  | "news";

export function FeedFilterBar({
  value,
  onChange,
}: {
  value: FeedFilterValue;
  onChange: (value: FeedFilterValue) => void;
}) {
  const items: Array<{
    value: FeedFilterValue;
    label: string;
  }> = [
    { value: "all", label: "Tümü" },
    { value: "unread", label: "Okunmamış" },
    { value: "urgent", label: "Önemli" },
    {
      value: "opportunities",
      label: "Fırsatlar",
    },
    { value: "news", label: "Dünya haberleri" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className={[
            "rounded-full border px-4 py-2 text-sm",
            value === item.value
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background",
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
