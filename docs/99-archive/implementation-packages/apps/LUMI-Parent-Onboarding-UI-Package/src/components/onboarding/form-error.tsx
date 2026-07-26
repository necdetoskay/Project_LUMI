export function FormError({
  message,
  requestId,
}: {
  message?: string;
  requestId?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
    >
      <p className="font-medium text-destructive">
        {message}
      </p>
      {requestId ? (
        <p className="mt-1 text-xs text-muted-foreground">
          İstek kodu: {requestId}
        </p>
      ) : null}
    </div>
  );
}
