"use client";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: "7d" | "30d" | "90d";
  onChange: (
    value: "7d" | "30d" | "90d",
  ) => void;
}) {
  return (
    <div className="flex gap-2">
      {(["7d", "30d", "90d"] as const).map(
        (item) => (
          <button
            key={item}
            type="button"
            aria-pressed={value === item}
            onClick={() => onChange(item)}
            className={[
              "rounded-full border px-4 py-2 text-sm",
              value === item
                ? "bg-primary text-primary-foreground"
                : "bg-background",
            ].join(" ")}
          >
            {item === "7d"
              ? "7 gün"
              : item === "30d"
                ? "30 gün"
                : "90 gün"}
          </button>
        ),
      )}
    </div>
  );
}
