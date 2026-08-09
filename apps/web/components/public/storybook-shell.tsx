import type { ReactNode } from "react";

export function StorybookBackdrop() {
  return (
    <div className="storybook-backdrop" aria-hidden="true">
      <div className="storybook-sun" />
      <div className="storybook-cloud storybook-cloud-a" />
      <div className="storybook-cloud storybook-cloud-b" />
      <div className="storybook-hill storybook-hill-far" />
      <div className="storybook-hill storybook-hill-near" />
      <div className="storybook-tree storybook-tree-a" />
      <div className="storybook-tree storybook-tree-b" />
      <div className="storybook-stars">✦ · ✧ · ✦</div>
    </div>
  );
}

export function StorybookCard({
  eyebrow,
  title,
  description,
  children,
  note,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="storybook-card" aria-labelledby="storybook-card-title">
      <div className="storybook-card-copy">
        <span className="storybook-eyebrow">{eyebrow}</span>
        <h1 id="storybook-card-title">{title}</h1>
        <p>{description}</p>
      </div>
      {children}
      {note ? <div className="storybook-card-note">{note}</div> : null}
    </section>
  );
}

export function StorybookScene({
  kicker,
  title,
  text,
  icon,
}: {
  kicker: string;
  title: string;
  text: string;
  icon: string;
}) {
  return (
    <aside className="storybook-scene" aria-label={`${title} hikâye sahnesi`}>
      <div className="storybook-scene-illustration" aria-hidden="true">
        <div className="storybook-moon">☾</div>
        <div className="storybook-cabin">
          <div className="storybook-cabin-window">✦</div>
        </div>
        <div className="storybook-path" />
        <div className="storybook-scene-icon">{icon}</div>
      </div>
      <div className="storybook-scene-copy">
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </aside>
  );
}
