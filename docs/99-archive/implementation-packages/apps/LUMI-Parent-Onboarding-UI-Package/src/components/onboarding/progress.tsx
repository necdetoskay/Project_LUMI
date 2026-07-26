type Step = {
  key: string;
  label: string;
};

const steps: Step[] = [
  { key: "household", label: "Aile" },
  { key: "child", label: "Çocuk" },
  { key: "world", label: "Dünya" },
  { key: "avatar", label: "Karakter" },
  { key: "summary", label: "Özet" },
];

export function OnboardingProgress({
  currentStep,
}: {
  currentStep: string;
}) {
  const currentIndex = steps.findIndex(
    (step) => step.key === currentStep,
  );

  return (
    <ol className="grid grid-cols-5 gap-2">
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="flex flex-col gap-2"
          aria-current={
            step.key === currentStep ? "step" : undefined
          }
        >
          <div
            className={[
              "h-2 rounded-full",
              index <= currentIndex
                ? "bg-primary"
                : "bg-muted",
            ].join(" ")}
          />
          <span className="text-xs text-muted-foreground">
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
