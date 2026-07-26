# Data Layer Test Matrix

## Foundation

- Environment validation
- Database connectivity
- Required schema existence
- Migration ordering

## Identity + Profile

- Unique email
- Household ownership
- Membership uniqueness
- Parental settings creation
- Child profile creation

## World + Media

- Universe/world/region/location chain
- Asset uniqueness
- World calendar
- Initial state

## Character + Inventory

- Character creation
- Trait initialization
- Relationship direction
- Personal inventory
- Item uniqueness
- Transactional transfer

## Story + Education

- Immutable story version
- Session participants
- Append-only decisions
- Single outcome
- Answer/reflection records

## Simulation + Memory

- 10-day freeze rule
- Intensity decay
- Event/state change
- Append-only memory
- Relevance constraints

## AI + Audit + System

- Prompt version uniqueness
- Attempt number uniqueness
- Token/cost constraints
- Audit append-only
- Outbox enqueue
- Idempotency replay
- Job attempt uniqueness

## Vertical Slice

- Complete onboarding foundation
- Audit record
- Outbox record
- Rollback on late failure
