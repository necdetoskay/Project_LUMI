import type { StoryChoice } from "@/lib/story/types";

export function ChoiceCard({
  choice,
  disabled,
  onSelect,
}: {
  choice: StoryChoice;
  disabled?: boolean;
  onSelect: (choice: StoryChoice) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(choice)}
      className="rounded-xl border bg-background p-5 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="font-medium">{choice.label}</span>

      {choice.hint ? (
        <span className="mt-2 block text-sm text-muted-foreground">
          {choice.hint}
        </span>
      ) : null}

      {choice.consequencePreview ? (
        <span className="mt-3 block text-xs text-primary">
          Olası etki: {choice.consequencePreview}
        </span>
      ) : null}
    </button>
  );
}
