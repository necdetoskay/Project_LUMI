# Story Challenge and Puzzle Encounters

**Status:** Planned canonical architecture  
**Applies to:** Sprint 09 Story Session, Sprint 10 Choice Consequence, Sprint 16 Story Reader UX  
**Created:** 2026-07-26

## Purpose

Project LUMI stories may include small challenge or puzzle encounters during
reading. These encounters should feel like natural story obstacles, not school
tests placed inside the story.

The first goal is:

> The child reaches a story obstacle, solves or explores a small age-appropriate
> challenge, and the story continues with a gentle consequence, hint, reward or
> alternate path.

## Product Principles

- Challenges must support the current scene, character, inventory or world
  context.
- The story must never hard-lock if the child cannot solve a puzzle.
- Every challenge must have a help path, easier hint or alternate continuation.
- The system should reward observation, empathy, memory and creativity more than
  speed.
- Challenges should be short enough to preserve bedtime/story flow.
- Parent policy and child age rules override challenge generation.

## Encounter Types

| Type | Example | Child value |
|---|---|---|
| `observation` | Find 3 glowing mushrooms in the forest image | Attention and discovery |
| `sound` | Choose which sound belongs to the stream | Listening and atmosphere |
| `sequence` | Step on bridge stones in the right order | Simple logic |
| `matching` | Match an animal track to the animal | Memory and learning |
| `empathy` | Choose what to say to a frightened NPC | Emotional intelligence |
| `inventory` | Use rope, lantern or map to cross an obstacle | Continuity and agency |
| `map` | Follow north tree, bridge, cave directions | Spatial awareness |
| `rhythm` | Knock two short and one long tap on a door | Playful participation |

## Candidate Selection

Challenge selection is not pure randomness. A random seed may propose variety,
but the final candidate must match the story context.

```text
Story Scene
Child Age and Profile
Parent Policy
Inventory
World State
Recent Motifs
Universe Seed
    |
Challenge Candidate Generation
    |
Schema, Safety, Difficulty and Context Validation
    |
Story Reader Encounter
    |
Outcome, Hint or Alternate Continuation
```

Example:

- If the scene is in a forest and the image has bird or stream hotspots, a sound
  or observation challenge may be selected.
- If the child has a lantern, a cave obstacle may allow an inventory challenge.
- If an NPC is sad or scared, an empathy challenge may be selected.
- If the story already used two matching puzzles recently, matching is
  down-weighted.

## Data Model

```ts
type StoryChallengeType =
  | "observation"
  | "sound"
  | "sequence"
  | "matching"
  | "empathy"
  | "inventory"
  | "map"
  | "rhythm";

type StoryChallengeDifficulty = "very_easy" | "easy" | "medium";

type StoryChallengeEncounter = {
  id: string;
  storySessionId: string;
  storyNodeId: string;
  type: StoryChallengeType;
  difficulty: StoryChallengeDifficulty;
  prompt: string;
  options?: StoryChallengeOption[];
  requiredInventoryKeys?: string[];
  relatedHotspotIds?: string[];
  maxAttempts?: number;
  hintPolicy: "always_available" | "after_first_try" | "auto_for_young_child";
  successOutcome: StoryChallengeOutcome;
  assistedOutcome: StoryChallengeOutcome;
  alternateOutcome: StoryChallengeOutcome;
  canonicalWorldStateEffect: "none" | "requires_story_outcome_commit";
};

type StoryChallengeOption = {
  id: string;
  label: string;
  isPreferred?: boolean;
};

type StoryChallengeOutcome = {
  narration: string;
  rewardKey?: string;
  badgeKey?: string;
  nextStoryNodeId?: string;
  traitNudge?: {
    key: "curiosity" | "kindness" | "patience" | "courage" | "care";
    delta: number;
  };
};
```

## Outcome Rules

LUMI is not a fail-state game. Challenge outcomes should create story texture,
not punishment.

| Result | Allowed effect |
|---|---|
| Solved | Small reward, NPC trust, badge, warmer narration |
| Solved with hint | Character helps, story continues normally |
| Different answer | Alternate path or small funny/soft consequence |
| Not solved | Easier clue, companion support, story continues |

Failure may never produce shame, fear, loss of access to the story, or a dead
end.

## Relationship With Hotspots

Image hotspots can prepare or trigger challenges, but they are not required.

Examples:

- Bird hotspot plays a sound, then a sound challenge asks what the bird might be
  warning about.
- Footprint hotspot reveals a clue, then an observation challenge asks which path
  has the same track.
- Stream hotspot plays water, then a map challenge asks where the bridge might
  be.

Hotspot taps may be recorded as local interaction events. They do not mutate
canonical world state directly.

## First Implementation Scope

The first version should support only three challenge types:

1. `observation`
2. `inventory`
3. `empathy`

This is enough to test the story feeling without delaying the first LUMI slice.

Not included in the first version:

- timed puzzles;
- scoring leaderboards;
- complex drag-and-drop mini-games;
- generated puzzle images requiring precise computer vision;
- canonical world state commits from challenge results.

## Validation Rules

The application rejects or repairs a challenge when:

- the type is not allowed for the child's age or parent policy;
- the challenge does not match the current scene;
- required inventory is missing;
- the prompt is too long for the age group;
- there is no assisted or alternate continuation;
- it repeats a recent challenge pattern too often;
- it requires knowledge outside the story context;
- it would block story progress;
- it attempts to change canonical world state without a validated story outcome
  commit.

## Quality Evaluation

Challenge generation should be included in the AI quality harness.

Minimum scoring dimensions:

- story fit;
- age appropriateness;
- clarity;
- emotional warmth;
- non-punitive fallback;
- novelty;
- continuity with inventory/world state;
- child engagement potential.

## Testing

Minimum tests before release:

- generated challenge schema validation;
- age and parent policy enforcement;
- missing inventory fallback;
- hint and assisted completion path;
- no-lock progression test;
- repeat motif/challenge type cooldown;
- story session persistence;
- accessibility labels for puzzle controls;
- mobile tap target and layout test.

## Acceptance Criteria

The feature is accepted when:

- a story node can include one validated challenge encounter;
- the reader can render observation, inventory and empathy challenges;
- every challenge has success, assisted and alternate outcomes;
- failing or skipping the challenge still continues the story;
- challenge results are saved as story session events;
- no challenge mutates canonical world state directly;
- challenge quality can be evaluated by the AI harness before release.

## Product Decision

Story challenges are an engagement and narrative-flow layer. They make the child
feel active inside the story, but they do not replace story choices, education
questions or world simulation. Canonical world changes still require the
separate validated story outcome flow.

