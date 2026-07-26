export type ParentAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  urgency: "normal" | "high";
};

export function ParentActionCenter({
  actions,
}: {
  actions: ParentAction[];
}) {
  return (
    <section className="rounded-2xl border bg-background p-6">
      <h2 className="text-xl font-semibold">
        Ebeveyn işlem merkezi
      </h2>

      <div className="mt-4 grid gap-3">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Şu anda bekleyen işlem yok.
          </p>
        ) : (
          actions.map((action) => (
            <a
              key={action.id}
              href={action.href}
              className="rounded-xl border p-4"
            >
              <p className="font-medium">
                {action.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {action.description}
              </p>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
