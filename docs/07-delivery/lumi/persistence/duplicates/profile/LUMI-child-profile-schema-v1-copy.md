
# Project LUMI — Child Profile Schema v1

- Status: Accepted
- Phase: Persistence Implementation

## Purpose
Defines the persistent data model for every child using LUMI.

## Aggregate Root
ChildProfile

The Child Profile is the ownership root for:
- Worlds
- Story Sessions
- Preferences
- Safety configuration
- Reading settings

## Core Table

child_profiles

Main fields:
- id
- parent_id
- display_name
- birth_year
- age_group
- preferred_language
- profile_status
- active_world_id
- active_story_session_id
- created_at
- updated_at
- version

## Interests

child_profile_interests

Fields:
- child_profile_id
- interest
- weight

## Preferences

child_profile_preferences

Examples:
- narration_speed
- narration_enabled
- subtitles_enabled
- preferred_story_length
- preferred_difficulty

## Safety Settings

child_profile_safety

Stores:
- allowed_content_level
- scary_content
- violence_level
- educational_mode
- bedtime_mode

## Favorite Characters

child_profile_favorites

Supports:
- favorite NPCs
- recurring companions
- preferred creatures

## Relationships

ChildProfile
├── Worlds (1:N)
├── StorySessions (1:N)
├── Preferences (1:1)
├── Safety (1:1)
├── Interests (1:N)
└── Favorites (1:N)

## Constraints

- One active preference row.
- One safety row.
- Active world must belong to the same child.
- Active session must belong to the same child.

## Indexes

- parent_id
- profile_status
- active_world_id
- active_story_session_id

## Lifecycle

created
→ active
→ archived
→ deleted

Soft delete preferred.

## Repository Responsibilities

- createProfile
- updatePreferences
- updateSafety
- listProfilesForParent
- archiveProfile
- setActiveWorld
- setActiveStorySession

## Acceptance

- Child can own multiple worlds.
- Only one active world.
- Only one active story session.
- Preferences and safety load with profile.
- Version column protects concurrent updates.

## Decisions Finalized

1. ChildProfile is an aggregate root.
2. Preferences and safety are separated.
3. Interests are weighted.
4. Soft delete is used.
5. Optimistic concurrency is mandatory.

## Next Artifact

World Schema v1
