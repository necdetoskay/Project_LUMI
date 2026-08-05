# Story Reader Follow-ups

Version: Draft v1.0

Status: Living Backlog

Created: 2026-08-04

---

# Purpose

This document records Story Reader ideas and hardening items intentionally kept
outside the active Sprint 16 delivery scope.

These items are not current sprint requirements and must not be silently pulled
into active implementation without explicit planning approval.

---

# Deferred Sprint 16 Follow-ups

## Accessibility audit evidence

Add a short audit artifact that captures:

- keyboard walkthrough notes;
- screen reader checkpoints;
- reduced-motion verification;
- contrast review evidence.

## Scene-type-aware reflection prompts

The current reflection layer adapts by child age band.

A future pass may also adapt prompts by scene type, session state, or recent
choice pattern so reflective questions feel more specific without becoming
spoiler-heavy.

## Richer media contracts

The reader now supports optional image and audio presentation with graceful
fallbacks. Future work may introduce:

- canonical scene media metadata from server read models;
- approved hotspot overlays and mute controls;
- richer narration status and loading states;
- provider-backed asset lifecycle indicators for parent-facing tooling.

## Reflection persistence and recap hooks

Reflection prompts are currently read-only. Future versions may explore:

- optional parent-approved reflection capture;
- checkpoint recap links;
- session summary surfaces that use child-safe reflection notes.

## Reader visual refinement

The current reader experience is functional and tested. A later polish pass may
address:

- denser responsive tuning for smaller tablets;
- iconography cleanup and stronger content hierarchy;
- shared design tokens for story-specific interaction panels.

---

# Boundaries

This backlog entry does not authorize:

- new paid media orchestration;
- backlog hotspot systems becoming active scope;
- outcome commit or world mutation behavior in the reader;
- analytics or engagement loops beyond current child-safe UX.

---

# Activation Rule

Any item in this file must be promoted into an active specification or sprint
plan before implementation work begins.
