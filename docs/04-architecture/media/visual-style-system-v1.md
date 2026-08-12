# LUMI Visual Style System v1

This document defines the runtime direction for LUMI visual generation.

## Resolution order

A generation request resolves style in this order, with the nearest explicit override winning:

1. asset override
2. story override
3. universe override
4. household/profile default
5. system default (`lumi-storybook`)

The selected style is persisted as both `styleId` and `styleVersion` in generation provenance so old assets remain explainable when catalog prompts evolve.

## Prompt composition

Generation prompts are composed from four independent concerns:

- entity identity
- requested visual states
- versioned visual style profile
- asset-type rules

Item generation must not receive story prose or character biography unless a specific identity attribute is required to define the item. This avoids subject leakage such as generating a child when a compass was requested.

## Item states

Bags are items, not a separate visual asset class. A bag usually has `closed` and `open` states. Other examples include compass `closed/open`, candle `unlit/lit/burned-down`, potion `full/half/empty`, lantern `off/on`, and chest `closed/open/empty`.

Up to four states may be requested in one grid generation. Generated grids are intermediate artifacts; publication should expose individually cropped and optimized state assets.

## Output policy

Published inventory state assets target a maximum display dimension of 300 px. Providers may render at a larger working resolution for quality; crop/validation/resize happens after generation.

All LUMI generated assets prohibit readable text, letters, numbers, logos, watermarks, captions, labels, typography, UI frames, and decorative borders unless a future explicit asset policy opts into text.

## Compatibility

The existing bag endpoint and bag UI may remain temporarily during migration. New domain behavior should model bag visuals through the generic item-state system and avoid introducing new bag-specific storage concepts.
