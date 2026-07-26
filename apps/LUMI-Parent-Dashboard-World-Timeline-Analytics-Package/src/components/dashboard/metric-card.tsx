export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <article className="rounded-2xl border bg-background p-5">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </article>
  );
}
