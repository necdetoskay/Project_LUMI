# First-Run Character Onboarding

**Version:** 1.0.0
**Status:** Canonical
**Owner:** Product / Experience Design
**Last Updated:** 2026-07-26

## Purpose

This document defines the first-run experience that asks the child who they want to be before LUMI creates the first world area. The first character choice is not cosmetic; it becomes the strongest seed for the initial world, home, nearby NPCs, tone and story opportunities.

## Product Principle

LUMI must create the first universe from the character outward.

The application should not generate a generic world first and then place a child avatar inside it. The child first chooses a character type, and LUMI derives the initial world proposal from that choice.

## First-Run Flow

1. The parent completes account and child profile setup.
2. LUMI asks the child: "Bu evrende kim olarak başlamak istersin?"
3. The child selects a character type.
4. The child chooses either manual setup or Auto generation.
5. LUMI proposes one or more origin package cards.
6. The child accepts one package, edits details, or refreshes the suggestions.
7. LUMI creates the starting home, location, nearby NPCs, first mystery and world seed from the accepted origin package.

## Character Type Choices

| Type | Examples | Expected world affinity |
| --- | --- | --- |
| Human | child, explorer, inventor, helper | village, town, forest edge, family home, workshop |
| Animal | fox, fish, bird, turtle, cat, wolf cub | forest, sea, lake, sky, cave, garden |
| Fantasy | dragon, fairy, tiny giant, crystal creature | mountains, magic forest, cloud islands, crystal caves |
| Robot / Construct | explorer robot, clockwork friend | workshop, old laboratory, city, observatory, space station |
| Sea creature | fish, dolphin, seahorse, crab | coral reef, underwater village, river, hidden lagoon |
| Sky creature | bird, winged horse, cloud child | cloud village, mountain peak, floating island, wind nest |

## Manual Path

Manual setup lets the child select or adjust subtype, name, visual direction, preferred tone, starting place from compatible suggestions, and home or nest style.

Manual setup must still respect world affinity. A fish should not start in a dry mountain village unless the origin package intentionally explains the exception in a safe, wondrous way.

## Auto Path

Auto generation is a first-class path, not a random fallback.

When the child selects Auto, LUMI generates 3-5 origin package cards. Each card must feel surprising, coherent and playable. The goal is for the family to feel: "Ben bunu düşünemezdim."

Each Auto card must include character concept, starting location, home or center, first nearby NPC, first mystery, emotional tone, first gentle goal and safety note if needed.

## Auto Card Actions

- **Start with this:** accept the package and create the universe.
- **Change details:** keep the core idea but edit name, home, tone or subtype.
- **Refresh:** generate a new set of compatible proposals.
- **Save for later:** optional backlog/favorites behavior for later versions.

Refresh must not simply shuffle names. It should produce materially different origin packages while preserving the selected character type and child profile safety constraints.

## Uniqueness Rules

Auto generation must avoid flat combinations such as "blue fish in coral sea." Each package should include at least one meaningful twist.

Good examples:

- a small fish that cannot sing but can hear lost voices in seashells;
- a young dragon whose wings glow only when someone tells the truth;
- a fox cub living in an abandoned moonlight library;
- a tiny robot that collects forgotten lullabies from broken clocks.

Bad examples:

- a brave dragon in a mountain;
- a cute cat in a village;
- a magic fairy in a forest.

## Safety and Age Fit

Origin packages must remain gentle, hopeful and age-appropriate. Mystery, loneliness, fear or loss may appear only as soft story tension with clear support, comfort and agency.

The parent policy and child profile must constrain all generated concepts.

## Acceptance Criteria

- The first world cannot be created without a character origin decision.
- Character type affects location, home, NPC and first mystery proposals.
- Auto mode returns multiple coherent origin package cards.
- Refresh produces new compatible packages.
- Accepted package becomes part of canonical world bootstrap input.
- The experience keeps hidden numeric vectors invisible to the child.
