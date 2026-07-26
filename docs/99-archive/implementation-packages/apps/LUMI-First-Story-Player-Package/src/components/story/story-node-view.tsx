import type { StoryNode } from "@/lib/story/types";

export function StoryNodeView({
  node,
}: {
  node: StoryNode;
}) {
  return (
    <article className="rounded-2xl border bg-background p-6 md:p-8">
      {node.imageAssetUrl ? (
        <img
          src={node.imageAssetUrl}
          alt=""
          className="mb-6 aspect-video w-full rounded-xl object-cover"
        />
      ) : null}

      {node.title ? (
        <h1 className="text-2xl font-semibold md:text-3xl">
          {node.title}
        </h1>
      ) : null}

      <div className="mt-5 whitespace-pre-line text-lg leading-8">
        {node.body}
      </div>

      {node.ambience?.length ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {node.ambience.map((item) => (
            <span
              key={item}
              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
