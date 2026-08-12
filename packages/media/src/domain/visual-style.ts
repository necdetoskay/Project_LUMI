export type VisualAssetType =
  | "character"
  | "item"
  | "environment"
  | "story-illustration";

export type VisualStyleId =
  | "lumi-storybook"
  | "soft-3d-adventure"
  | "paper-cut-world"
  | "colored-pencil-dreams"
  | "classic-fairytale"
  | "minimal-pastel";

export type VisualStyleProfile = {
  id: VisualStyleId;
  version: number;
  name: string;
  description: string;
  previewAssetRef: string | null;
  corePrompt: readonly string[];
  negativePrompt: readonly string[];
  rules: Readonly<Record<VisualAssetType, readonly string[]>>;
};

const GLOBAL_NEGATIVE_PROMPT = [
  "no text",
  "no letters",
  "no numbers",
  "no logo",
  "no watermark",
  "no caption",
  "no label",
  "no typography",
  "no UI",
  "no border",
] as const;

function style(
  profile: Omit<
    VisualStyleProfile,
    "version" | "previewAssetRef" | "negativePrompt"
  > & {
    negativePrompt?: readonly string[];
  },
): VisualStyleProfile {
  return {
    ...profile,
    version: 1,
    previewAssetRef: null,
    negativePrompt: [
      ...GLOBAL_NEGATIVE_PROMPT,
      ...(profile.negativePrompt ?? []),
    ],
  };
}

export const VISUAL_STYLE_CATALOG: readonly VisualStyleProfile[] = [
  style({
    id: "lumi-storybook",
    name: "LUMI Storybook",
    description:
      "Warm hand-painted children's fantasy storybook illustration with soft gouache and watercolor texture.",
    corePrompt: [
      "premium children's fantasy storybook illustration",
      "handcrafted painterly depth",
      "delicate gouache and watercolor surface texture",
      "warm controlled color palette",
      "soft natural lighting",
      "clean readable silhouette",
      "gentle paper grain",
      "rounded friendly forms",
    ],
    rules: {
      character: [
        "preserve the character identity and proportions",
        "show a clear expressive child-safe pose",
      ],
      item: [
        "single isolated inventory object",
        "centered composition",
        "simple warm neutral background",
        "subtle grounding shadow",
        "no people, children, faces, hands or animals",
      ],
      environment: [
        "wide readable storybook environment",
        "clear foreground, middle ground and background",
        "no text or signage unless explicitly required by story canon",
      ],
      "story-illustration": [
        "cinematic but child-safe storybook composition",
        "preserve established character and world identities",
      ],
    },
  }),
  style({
    id: "soft-3d-adventure",
    name: "Soft 3D Adventure",
    description:
      "Soft stylized 3D story world with toyetic forms, warm lighting and handcrafted materials.",
    corePrompt: [
      "soft stylized 3D children's adventure illustration",
      "rounded toyetic forms",
      "handcrafted material feel",
      "warm cinematic lighting",
      "soft shadows",
      "friendly readable silhouettes",
    ],
    rules: {
      character: ["preserve identity", "soft expressive facial design"],
      item: [
        "single isolated object",
        "centered three-quarter view",
        "no people, children, faces, hands or animals",
      ],
      environment: [
        "layered stylized 3D environment",
        "soft atmospheric depth",
      ],
      "story-illustration": [
        "cinematic child-safe composition",
        "preserve canon identities",
      ],
    },
    negativePrompt: ["no photorealism", "no ecommerce product photography"],
  }),
  style({
    id: "paper-cut-world",
    name: "Paper Cut World",
    description:
      "Layered cut-paper illustration with tactile edges, simple shapes and gentle depth.",
    corePrompt: [
      "layered paper-cut children's illustration",
      "tactile cut-paper edges",
      "simple geometric shapes",
      "gentle layered depth",
      "soft handcrafted shadows",
    ],
    rules: {
      character: ["preserve character identity using paper-cut shapes"],
      item: [
        "single isolated paper-cut object",
        "no people, children, faces or hands",
      ],
      environment: ["layered paper diorama composition"],
      "story-illustration": [
        "paper theatre composition",
        "preserve identities",
      ],
    },
  }),
  style({
    id: "colored-pencil-dreams",
    name: "Colored Pencil Dreams",
    description:
      "Soft colored-pencil illustration with visible hand-drawn strokes and dreamy warmth.",
    corePrompt: [
      "hand-drawn colored-pencil children's illustration",
      "visible pencil texture",
      "soft pastel shading",
      "warm paper surface",
      "gentle dreamy atmosphere",
    ],
    rules: {
      character: [
        "preserve character identity",
        "natural hand-drawn expression",
      ],
      item: ["single isolated object", "no people, children, faces or hands"],
      environment: ["softly layered illustrated environment"],
      "story-illustration": [
        "dreamy child-safe composition",
        "preserve identities",
      ],
    },
  }),
  style({
    id: "classic-fairytale",
    name: "Classic Fairytale",
    description:
      "Detailed traditional fairytale-book illustration with elegant shapes and rich painted atmosphere.",
    corePrompt: [
      "classic children's fairytale book illustration",
      "rich painted detail",
      "elegant organic shapes",
      "warm luminous atmosphere",
      "traditional illustrated-book finish",
    ],
    rules: {
      character: [
        "preserve character identity",
        "storybook-natural proportions",
      ],
      item: [
        "single isolated illustrated object",
        "no people, children, faces or hands",
      ],
      environment: [
        "rich fairytale environment",
        "clear narrative focal point",
      ],
      "story-illustration": [
        "traditional story plate composition",
        "preserve identities",
      ],
    },
  }),
  style({
    id: "minimal-pastel",
    name: "Minimal Pastel",
    description:
      "Minimal child-friendly illustration with simple forms, pastel colors and very low visual clutter.",
    corePrompt: [
      "minimal children's illustration",
      "simple rounded shapes",
      "soft pastel palette",
      "low visual clutter",
      "clean negative space",
    ],
    rules: {
      character: ["preserve character identity using simplified forms"],
      item: [
        "single isolated simplified object",
        "no people, children, faces or hands",
      ],
      environment: ["minimal environment", "clear simple spatial layers"],
      "story-illustration": [
        "simple readable child-safe composition",
        "preserve identities",
      ],
    },
  }),
] as const;

export const DEFAULT_VISUAL_STYLE_ID: VisualStyleId = "lumi-storybook";

export function getVisualStyleProfile(
  id: VisualStyleId,
  version?: number,
): VisualStyleProfile {
  const profile = VISUAL_STYLE_CATALOG.find(
    (candidate) =>
      candidate.id === id &&
      (version === undefined || candidate.version === version),
  );
  if (!profile) {
    throw new Error(`VISUAL_STYLE_NOT_FOUND:${id}:${version ?? "latest"}`);
  }
  return profile;
}
