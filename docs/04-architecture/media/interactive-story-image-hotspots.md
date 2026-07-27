# Interactive Story Image Hotspots

**Status:** Planned canonical architecture  
**Applies to:** Sprint 15 Media Pipeline, Sprint 16 Story Reader UX  
**Created:** 2026-07-26

## Purpose

Story images in LUMI should not be passive decorations. After a story scene is
generated, selected image areas may become small interactive hotspots that make
the page feel discoverable during reading.

The first goal is child engagement without turning the page into a noisy game:

> A child can tap a few meaningful points in the story image and hear or reveal
> small context-aware details such as birds, wind, water, thunder, distant howls,
> footprints, a hidden clue or a soft emotional prompt.

## Experience Rules

Hotspots must support the current story moment. They are not random soundboard
buttons.

- Each story image should normally contain 2-5 hotspots.
- Each scene may contain at most 1 major discovery hotspot.
- Sound effects should be short, normally 1-4 seconds.
- Repeated taps should be rate-limited to avoid audio spam.
- Icons should be subtle and readable, not cover the main subject.
- A hotspot may be hidden until the child taps near it if the scene is designed
  as a discovery moment.
- Hotspots must never carry scary surprise audio or startle effects for young
  children.

## Hotspot Types

| Type | Example | Effect |
|---|---|---|
| `sound` | bird, wind, stream, thunder, distant wolf | Plays a short SFX clip |
| `discovery` | footprint, old key, glowing stone | Opens a small story detail |
| `hint` | broken branch, smoke, far light | Gives a soft clue for the next choice |
| `emotion` | sad NPC, frightened animal | Shows an age-appropriate reflection prompt |
| `choice` | cave, bridge, path | Prepares or triggers a story choice |

## Data Model

Coordinates are stored as percentages so the same hotspot can work across
responsive image sizes.

```ts
type StoryImageHotspotType =
  | "sound"
  | "discovery"
  | "hint"
  | "emotion"
  | "choice";

type StoryImageHotspot = {
  id: string;
  storySessionId: string;
  storyNodeId: string;
  imageId: string;
  type: StoryImageHotspotType;
  label: string;
  x: number; // 0-100
  y: number; // 0-100
  radius?: number; // percentage based touch radius
  iconKey: string;
  soundKey?: string;
  text?: string;
  choiceId?: string;
  safetyRating: "calm" | "mild" | "attention";
  requiresParentEnabledAudio?: boolean;
};
```

Example:

```json
{
  "id": "hotspot_forest_bird_01",
  "storySessionId": "story_123",
  "storyNodeId": "node_001",
  "imageId": "image_forest_walk_001",
  "type": "sound",
  "label": "Kus sesi",
  "x": 72,
  "y": 18,
  "radius": 6,
  "iconKey": "bird",
  "soundKey": "forest_bird_soft",
  "safetyRating": "calm",
  "requiresParentEnabledAudio": true
}
```

## Generation Flow

Hotspots are generated after the story scene and scene image brief are known.
The LLM may propose hotspot candidates, but the application validates and stores
only approved hotspot records.

```text
Story Scene
    |
Image Brief and Rendered Image
    |
Hotspot Candidate Generation
    |
Schema, Safety and Density Validation
    |
SFX/Icon Asset Resolution
    |
Story Reader Overlay
    |
Tap Event, Audio/Text/Choice Effect
```

## Validation Rules

The application rejects or repairs hotspot output when:

- coordinates are outside `0-100`;
- two icons overlap too closely;
- a scene has too many hotspots;
- a sound effect is not present in the approved SFX library;
- the hotspot does not match the scene context;
- a child profile age rule disallows the sound or prompt;
- a choice hotspot points to a missing or invalid choice;
- the hotspot would reveal a major story answer too early.

## SFX Library

The first version should use a curated local SFX key library before any dynamic
audio generation is considered.

Initial categories:

- forest ambience: birds, leaves, wind, branches;
- water: stream, drops, distant waves;
- weather: soft rain, mild thunder, wind gust;
- distant life: far animal calls, village bell, footsteps;
- object sounds: door, key, wooden bridge, page turn;
- emotional cues: soft sparkle, warm discovery, gentle concern.

All SFX entries need metadata:

```ts
type SfxAsset = {
  key: string;
  category: string;
  durationMs: number;
  intensity: "calm" | "mild" | "attention";
  minAge: number;
  loopable: boolean;
  license: string;
};
```

## Parent and Child Safety

Audio interactivity is parent-controlled.

- Parent can disable hotspot audio.
- Parent can allow only calm sounds.
- Story reader must have a visible mute control.
- No loud, sudden or horror-style effects.
- Distant wolf, thunder or similar sounds must be mild and contextual.
- The system should prefer curiosity and atmosphere over fear.

## First Implementation Scope

The first implementation should be intentionally small:

1. Store hotspot records for a generated story image.
2. Render icon overlays on the image.
3. Play approved local SFX on tap.
4. Show short text for discovery or hint hotspots.
5. Persist a lightweight `hotspotTapped` event for analytics and replay.

Not included in the first version:

- dynamic SFX generation;
- precise computer-vision placement;
- animated hotspot paths;
- complex mini-games inside the image;
- hotspots that mutate canonical world state directly.

## Testing

Minimum tests before release:

- responsive coordinate placement on mobile and desktop;
- icon overlap and touch target validation;
- audio mute and parent setting enforcement;
- missing SFX fallback;
- repeated tap rate limiting;
- story context validation;
- accessibility labels for icon buttons;
- snapshot/replay test for saved hotspot records.

## Acceptance Criteria

The feature is accepted when:

- a generated forest scene can display 2-5 validated hotspots;
- tapping a bird hotspot plays a short bird sound;
- tapping a stream/wind/weather hotspot plays the correct approved SFX;
- a discovery hotspot can show a short story detail;
- parent mute disables all hotspot audio;
- the page still works when SFX is unavailable;
- hotspots do not block reading, choices or narration controls.

## Product Decision

Interactive image hotspots are part of the story reader experience, not the
world simulation core. They can create engagement, hints and local story
interactions, but they do not update canonical world state unless a separate
validated story choice or outcome commit explicitly does so.

