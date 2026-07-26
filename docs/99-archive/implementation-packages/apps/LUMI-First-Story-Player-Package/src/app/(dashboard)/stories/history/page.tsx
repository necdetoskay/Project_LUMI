import Link from "next/link";

const stories = [
  {
    id: "demo-session",
    title: "Kayıp Işık Haritası",
    status: "Tamamlandı",
    date: "25 Temmuz 2026",
  },
];

export default function StoryHistoryPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Hikâyeler
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Macera geçmişi
        </h1>
      </div>

      <div className="grid gap-4">
        {stories.map((story) => (
          <article
            key={story.id}
            className="rounded-xl border bg-background p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium">
                  {story.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {story.date} · {story.status}
                </p>
              </div>

              <Link
                href={`/stories/player/${story.id}`}
                className="text-sm font-medium text-primary"
              >
                Tekrar oku
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
