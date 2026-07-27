# Media Generation Policy

**Status:** Planned canonical architecture
**Applies to:** Sprint 12 AI Integration, Sprint 15 Media Pipeline, Sprint 16 Story Reader UX
**Created:** 2026-07-27

## Purpose

Project LUMI uses media to make stories feel warm, discoverable and alive. Media
generation must stay bounded by child safety, parent cost visibility and the
first implementation slice.

This policy captures the first canonical decisions for:

- visual style;
- curated SFX;
- deferred AI audio generation;
- parent-facing cost preview;
- cost ledger records.

## Visual Style

LUMI uses different visual styles for different product surfaces.

| Surface | Default style | Notes |
|---|---|---|
| Main story scene image | warm children's book illustration | Primary story image; should show characters and location clearly |
| World map marker | pixel or sticker icon | Small, readable, reusable |
| Inventory item | pixel or sticker icon | Must be recognizable at small size |
| Badge/reward | sticker icon | Cheerful, simple and non-noisy |
| Hotspot icon | subtle sticker or line icon | Must not cover the main image subject |

Pixel art is allowed for helper assets, but it is not the default style for the
main story scene image. The main scene should preserve a cozy children's book
feeling unless a specific story theme intentionally chooses another approved
style.

## Initial Approved SFX Keys

The first version uses a curated local SFX library. Dynamic AI SFX generation is
not part of the first implementation slice.

Initial approved keys:

| Key | Category | Intensity | Use |
|---|---|---|---|
| `forest_bird_soft` | forest ambience | calm | bird hotspot, forest discovery |
| `forest_wind_light` | forest ambience | calm | trees, leaves, path atmosphere |
| `water_stream_distant` | water | calm | stream, bridge, riverbank |
| `magic_chime_soft` | emotional cue | calm | discovery, gentle wonder, small reward |

Additional SFX may be added only when each asset has metadata for duration,
intensity, minimum age, loop behavior and license.

## Audio Generation Boundary

The first media pipeline should prefer:

1. local curated SFX;
2. local mute/fallback behavior;
3. TTS only when parent settings and cost preview allow it.

AI-generated one-off sound effects are deferred. They may be reconsidered after
the first story reader slice proves:

- parent mute and safety settings work;
- SFX fallbacks are reliable;
- cost previews match recorded actual costs;
- generated stories remain usable without custom audio.

## Parent Cost Preview

Before a paid generation run starts, the parent must see an estimated cost
summary. The preview should be simple enough to understand without exposing
internal provider complexity.

Example:

| Item | Count | Estimated cost |
|---|---:|---:|
| Story text | 1 | 0.20 TRY |
| Story image | 1 | 0.75 TRY |
| TTS narration | 1 | 0.40 TRY |
| Curated SFX | 4 | 0.00 TRY |
| Total estimate |  | 1.35 TRY |

The product may show a rounded total and a short breakdown. The child-facing
reader never shows cost controls.

## Cost Ledger

Every AI or paid media generation attempt must create a cost ledger record.
Curated local SFX can record zero cost for analytics, but should not be treated
as a paid provider call.

Minimum fields:

```ts
type MediaCostLedgerRecord = {
  id: string;
  storySessionId?: string;
  childProfileId?: string;
  parentAccountId: string;
  task:
    | "story_text"
    | "story_image"
    | "tts_narration"
    | "sfx_local"
    | "sfx_generated";
  provider: string;
  model?: string;
  assetKey?: string;
  estimatedCostTry: number;
  actualCostTry?: number;
  currency: "TRY" | "USD";
  status: "previewed" | "requested" | "succeeded" | "failed" | "cancelled";
  createdAt: string;
};
```

## Acceptance Criteria

The policy is satisfied when:

- main story images default to children's book illustration style;
- helper assets use pixel/sticker style where appropriate;
- the first hotspot layer can resolve the four approved SFX keys;
- AI-generated custom SFX is not required for the first slice;
- parent cost preview is shown before paid generation;
- generation attempts write cost ledger records;
- child-facing screens do not expose price settings or provider details.
