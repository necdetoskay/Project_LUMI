BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS profile;
CREATE SCHEMA IF NOT EXISTS world;
CREATE SCHEMA IF NOT EXISTS character;
CREATE SCHEMA IF NOT EXISTS story;
CREATE SCHEMA IF NOT EXISTS simulation;
CREATE SCHEMA IF NOT EXISTS memory;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS education;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS system;

COMMENT ON SCHEMA identity IS
  'Authentication, users, sessions, roles and permissions.';

COMMENT ON SCHEMA profile IS
  'Households, child profiles and parental preferences.';

COMMENT ON SCHEMA world IS
  'Universes, worlds, regions, locations and world topology.';

COMMENT ON SCHEMA character IS
  'Characters, traits, emotions, relationships and conditions.';

COMMENT ON SCHEMA story IS
  'Stories, versions, sessions, decisions and outcomes.';

COMMENT ON SCHEMA simulation IS
  'World simulation runs, events, state changes and background actions.';

COMMENT ON SCHEMA memory IS
  'Persistent memories, memory links and derived summaries.';

COMMENT ON SCHEMA inventory IS
  'Item definitions, item instances, inventories and transfers.';

COMMENT ON SCHEMA education IS
  'Questions, answers, reflections and learning observations.';

COMMENT ON SCHEMA media IS
  'Media assets, variants and generation jobs.';

COMMENT ON SCHEMA ai IS
  'AI providers, models, prompts, generation requests and costs.';

COMMENT ON SCHEMA audit IS
  'Audit and security event records.';

COMMENT ON SCHEMA system IS
  'Outbox, idempotency, migration metadata and feature flags.';

COMMIT;
