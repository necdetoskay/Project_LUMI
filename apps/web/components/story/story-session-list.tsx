export type StorySessionSummary = {
  session: {
    id: string;
    sessionStatus: string;
    playbackMode: string;
    updatedAt: string | Date;
  };
  currentScene: {
    title: string | null;
    sceneKey: string;
  } | null;
  definition: {
    title: string;
  } | null;
  version: {
    versionNumber: number;
    title: string;
  } | null;
  latestCheckpoint: {
    createdAt: string | Date;
  } | null;
};

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString("tr-TR");
}

export function StorySessionList({
  sessions,
}: {
  sessions: StorySessionSummary[];
}) {
  if (sessions.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-8 py-14 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[32px]">
            menu_book
          </span>
        </div>
        <h3 className="text-xl font-bold text-on-surface">Henuz hikaye yok</h3>
        <p className="mx-auto mt-2 max-w-[34rem] text-sm leading-6 text-on-surface-variant">
          Bu profil icin henuz baslatilmis bir oturum yok. Story Reader yuzeyi
          hazir; bir sonraki adim yeni hikaye baslatma akisina baglamak.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {sessions.map((entry) => (
        <article
          key={entry.session.id}
          className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
                {entry.definition?.title ?? "Untitled story"}
              </p>
              <h3 className="mt-2 text-lg font-bold text-on-surface">
                {entry.currentScene?.title ??
                  entry.currentScene?.sceneKey ??
                  "Bekleyen sahne"}
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Durum: {entry.session.sessionStatus} | Mod:{" "}
                {entry.session.playbackMode}
              </p>
            </div>
            <a
              className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4c29cf]"
              href={`/app/stories/${entry.session.id}`}
            >
              Devam et
            </a>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-on-surface">Versiyon</dt>
              <dd>
                v{entry.version?.versionNumber ?? "-"}{" "}
                {entry.version?.title ?? ""}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Guncellendi</dt>
              <dd>{formatDate(entry.session.updatedAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Checkpoint</dt>
              <dd>
                {entry.latestCheckpoint
                  ? formatDate(entry.latestCheckpoint.createdAt)
                  : "Yok"}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
