import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import {
  StoryDefinition,
  StoryVersion,
  StoryScene,
  StorySceneTransition,
} from "../domain";
import { ValidationError, NotFoundError } from "../domain/errors";
import { getStoryDb } from "./db";
import { hashObject } from "./hash";
import type { Database } from "../db/client";

import type { StoryMode } from "../domain/story-types";
import {
  assertKnownStoryType,
  assertKnownSourceType,
  assertKnownStoryVersionStatus,
  assertKnownStoryMode,
  assertKnownSceneType,
  assertKnownTransitionType,
  assertKnownLifecycle,
} from "../domain/story-types";

let testDb: Database | undefined;

export function __setTestDefinitionDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface CreateStoryDefinitionServiceInput {
  householdId: string;
  childProfileId?: string;
  title: string;
  slug: string;
  storyType: string;
  sourceType: string;
  ageGroup: string;
  defaultLanguage: string;
}

export async function createStoryDefinition(
  input: CreateStoryDefinitionServiceInput,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  assertKnownStoryType(input.storyType);
  assertKnownSourceType(input.sourceType);
  const story = StoryDefinition.create({
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    title: input.title,
    slug: input.slug,
    storyType: input.storyType,
    sourceType: input.sourceType,
    ageGroup: input.ageGroup,
    defaultLanguage: input.defaultLanguage,
  });
  const state = story.getState();
  const record = await repo.createDefinition(db, {
    id: state.id,
    householdId: state.householdId,
    childProfileId: state.childProfileId,
    title: state.title,
    slug: state.slug,
    storyType: state.storyType,
    sourceType: state.sourceType,
    lifecycle: state.lifecycle,
    currentPublishedVersionId: state.currentPublishedVersionId,
    ageGroup: state.ageGroup,
    defaultLanguage: state.defaultLanguage,
    version: state.version,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    archivedAt: state.archivedAt,
  });

  return record;
}

export interface CreateStoryVersionServiceInput {
  storyDefinitionId: string;
  versionNumber: number;
  schemaVersion?: number;
  title: string;
  storyMode: StoryMode;
}

export async function createStoryVersion(
  input: CreateStoryVersionServiceInput,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const version = StoryVersion.create({
    storyDefinitionId: input.storyDefinitionId,
    versionNumber: input.versionNumber,
    schemaVersion: input.schemaVersion ?? 1,
    title: input.title,
    storyMode: input.storyMode,
  });
  const state = version.getState();
  const record = await repo.createVersion(db, {
    id: state.id,
    storyDefinitionId: state.storyDefinitionId,
    versionNumber: state.versionNumber,
    publicationStatus: state.publicationStatus,
    schemaVersion: state.schemaVersion,
    title: state.title,
    summary: state.summary,
    storyMode: state.storyMode,
    contentHash: state.contentHash,
    createdAt: state.createdAt,
    frozenAt: state.frozenAt,
    publishedAt: state.publishedAt,
    retiredAt: state.retiredAt,
  });
  return record;
}

export interface SceneGraphInput {
  sceneKey: string;
  sequenceNumber: number;
  sceneType: string;
  title?: string;
  narrativeText: string;
  isEntryScene?: boolean;
  isTerminalScene?: boolean;
}

export interface TransitionGraphInput {
  fromSceneKey: string;
  toSceneKey: string;
  transitionType: string;
  priority?: number;
}

export interface SaveSceneGraphInput {
  storyDefinitionId: string;
  storyVersionId: string;
  scenes: SceneGraphInput[];
  transitions: TransitionGraphInput[];
}

export async function saveSceneGraph(input: SaveSceneGraphInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  const versionRecord = await repo.findVersionById(db, input.storyVersionId);
  if (!versionRecord) {
    throw new NotFoundError("StoryVersion", input.storyVersionId);
  }
  assertKnownStoryVersionStatus(versionRecord.publicationStatus);
  assertKnownStoryMode(versionRecord.storyMode);
  const version = StoryVersion.fromState({
    ...versionRecord,
    publicationStatus: versionRecord.publicationStatus,
    storyMode: versionRecord.storyMode,
    summary: versionRecord.summary ?? null,
    contentHash: versionRecord.contentHash ?? null,
    frozenAt: versionRecord.frozenAt ?? null,
    publishedAt: versionRecord.publishedAt ?? null,
    retiredAt: versionRecord.retiredAt ?? null,
  });
  version.assertMutable();

  const scenes = input.scenes.map((s) => {
    assertKnownSceneType(s.sceneType);
    return StoryScene.create({
      storyVersionId: input.storyVersionId,
      sceneKey: s.sceneKey,
      sequenceNumber: s.sequenceNumber,
      sceneType: s.sceneType,
      title: s.title,
      narrativeText: s.narrativeText,
      isEntryScene: s.isEntryScene,
      isTerminalScene: s.isTerminalScene,
    });
  });
  const sceneMap = new Map(scenes.map((s) => [s.sceneKey, s.id]));
  const transitions = input.transitions.map((t) => {
    const fromSceneId = sceneMap.get(t.fromSceneKey);
    const toSceneId = sceneMap.get(t.toSceneKey);
    if (!fromSceneId || !toSceneId) {
      throw new ValidationError(
        "INVALID_TRANSITION",
        `Transition references unknown scene keys: ${t.fromSceneKey} -> ${t.toSceneKey}`,
      );
    }
    assertKnownTransitionType(t.transitionType);
    return StorySceneTransition.create({
      storyVersionId: input.storyVersionId,
      fromSceneId,
      toSceneId,
      transitionType: t.transitionType,
      priority: t.priority,
    });
  });

  version.validatesGraph(scenes, transitions);

  const graphHash = await hashObject({
    versionId: input.storyVersionId,
    scenes: scenes.map((s) => ({ ...s })),
    transitions: transitions.map((t) => ({ ...t })),
  });

  return db.transaction(async (tx) => {
    for (const scene of scenes) {
      const s = scene;
      await repo.createScene(tx, {
        id: s.id,
        storyVersionId: s.storyVersionId,
        sceneKey: s.sceneKey,
        sequenceNumber: s.sequenceNumber,
        sceneType: s.sceneType,
        title: s.title,
        narrativeText: s.narrativeText,
        isEntryScene: s.isEntry,
        isTerminalScene: s.isTerminal,
        metadata: s.metadata,
        createdAt: s.createdAt,
      });
    }
    for (const transition of transitions) {
      const t = transition;
      await repo.createTransition(tx, {
        id: t.id,
        storyVersionId: t.storyVersionId,
        fromSceneId: t.fromSceneId,
        toSceneId: t.toSceneId,
        transitionType: t.transitionType,
        priority: t.priority,
        createdAt: t.createdAt,
      });
    }

    version.freeze(graphHash);
    const frozenState = version.getState();
    await repo.updateVersion(tx, input.storyVersionId, {
      publicationStatus: frozenState.publicationStatus,
      contentHash: frozenState.contentHash,
      frozenAt: frozenState.frozenAt,
    });

    return {
      storyVersionId: input.storyVersionId,
      sceneIds: scenes.map((s) => s.id),
      transitionIds: transitions.map((t) => t.id),
      contentHash: graphHash,
    };
  });
}

export async function publishStoryVersion(
  storyDefinitionId: string,
  storyVersionId: string,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();

  const definitionRecord = await repo.findDefinitionById(db, storyDefinitionId);
  if (!definitionRecord) {
    throw new NotFoundError("StoryDefinition", storyDefinitionId);
  }

  const versionRecord = await repo.findVersionById(db, storyVersionId);
  if (!versionRecord) {
    throw new NotFoundError("StoryVersion", storyVersionId);
  }

  assertKnownStoryVersionStatus(versionRecord.publicationStatus);
  assertKnownStoryMode(versionRecord.storyMode);
  const version = StoryVersion.fromState({
    ...versionRecord,
    publicationStatus: versionRecord.publicationStatus,
    storyMode: versionRecord.storyMode,
    summary: versionRecord.summary ?? null,
    contentHash: versionRecord.contentHash ?? null,
    frozenAt: versionRecord.frozenAt ?? null,
    publishedAt: versionRecord.publishedAt ?? null,
    retiredAt: versionRecord.retiredAt ?? null,
  });

  version.publish();
  const newState = version.getState();

  assertKnownStoryType(definitionRecord.storyType);
  assertKnownSourceType(definitionRecord.sourceType);
  assertKnownLifecycle(definitionRecord.lifecycle);
  const definition = StoryDefinition.fromState({
    ...definitionRecord,
    storyType: definitionRecord.storyType,
    sourceType: definitionRecord.sourceType,
    lifecycle: definitionRecord.lifecycle,
    childProfileId: definitionRecord.childProfileId ?? null,
    currentPublishedVersionId:
      definitionRecord.currentPublishedVersionId ?? null,
    archivedAt: definitionRecord.archivedAt ?? null,
  });
  definition.setCurrentPublishedVersion(storyVersionId);
  const defState = definition.getState();

  return db.transaction(async (tx) => {
    await repo.updateVersion(tx, storyVersionId, {
      publicationStatus: newState.publicationStatus,
      publishedAt: newState.publishedAt,
    });
    await repo.updateDefinition(tx, storyDefinitionId, {
      currentPublishedVersionId: defState.currentPublishedVersionId,
      lifecycle: defState.lifecycle,
      version: defState.version,
      updatedAt: defState.updatedAt,
    });

    return {
      storyDefinitionId,
      storyVersionId,
      publicationStatus: newState.publicationStatus,
    };
  });
}

const STARTER_STORY_SEEDS = [
  {
    title: "Mercan Feneri",
    slug: "starter-mercan-feneri",
    storyType: "world_event",
    sourceType: "authored",
    ageGroup: "6-8",
    defaultLanguage: "tr-TR",
    versionTitle: "Mercan Feneri / Baslangic",
    storyMode: "interactive" as StoryMode,
    scenes: [
      {
        sceneKey: "arrival",
        sequenceNumber: 0,
        sceneType: "narrative",
        title: "Fenerin Cagrisi",
        narrativeText:
          "Kiyiya vuran yumusak bir isik, dunyanin bir yerinde seni bekleyen yeni bir iz oldugunu fisildar.",
        isEntryScene: true,
      },
      {
        sceneKey: "promise",
        sequenceNumber: 1,
        sceneType: "ending",
        title: "Ilk Soz",
        narrativeText:
          "Karakter, isigin izini surmeye karar verir ve bu karar yeni maceranin ilk dugumunu kurar.",
        isTerminalScene: true,
      },
    ],
    transitions: [
      {
        fromSceneKey: "arrival",
        toSceneKey: "promise",
        transitionType: "automatic",
      },
    ],
  },
  {
    title: "Yuva Yolunda",
    slug: "starter-yuva-yolunda",
    storyType: "continuing",
    sourceType: "authored",
    ageGroup: "6-8",
    defaultLanguage: "tr-TR",
    versionTitle: "Yuva Yolunda / Baslangic",
    storyMode: "static" as StoryMode,
    scenes: [
      {
        sceneKey: "homecoming",
        sequenceNumber: 0,
        sceneType: "narrative",
        title: "Yuvaya Donus",
        narrativeText:
          "Gun kapanirken karakter, evine donerken gordugu kucuk degisikliklerin aslinda buyuk bir hikayenin basi olabilecegini fark eder.",
        isEntryScene: true,
      },
      {
        sceneKey: "question",
        sequenceNumber: 1,
        sceneType: "ending",
        title: "Acilan Soru",
        narrativeText:
          "Kapinin esiginde duran ipucu, bir sonraki bolume tasinacak yeni bir soruyu usulca birakir.",
        isTerminalScene: true,
      },
    ],
    transitions: [
      {
        fromSceneKey: "homecoming",
        toSceneKey: "question",
        transitionType: "automatic",
      },
    ],
  },
];

export async function ensureStarterStoriesForHousehold(householdId: string) {
  const existingCatalog = await getStoryCatalog(householdId);
  if (existingCatalog.length > 0) {
    return existingCatalog;
  }

  for (const seed of STARTER_STORY_SEEDS) {
    try {
      const definition = await createStoryDefinition({
        householdId,
        title: seed.title,
        slug: seed.slug,
        storyType: seed.storyType,
        sourceType: seed.sourceType,
        ageGroup: seed.ageGroup,
        defaultLanguage: seed.defaultLanguage,
      });

      const version = await createStoryVersion({
        storyDefinitionId: definition.id,
        versionNumber: 1,
        title: seed.versionTitle,
        storyMode: seed.storyMode,
      });

      await saveSceneGraph({
        storyDefinitionId: definition.id,
        storyVersionId: version.id,
        scenes: seed.scenes,
        transitions: seed.transitions,
      });

      await publishStoryVersion(definition.id, version.id);
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === "23505") {
        return getStoryCatalog(householdId);
      }
      throw error;
    }
  }

  return getStoryCatalog(householdId);
}
export async function getStoryCatalog(householdId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const definitions = await repo.findDefinitionsByHousehold(db, householdId);
  const published = definitions.filter(
    (d) => d.lifecycle === "published" || d.lifecycle === "retired",
  );

  const versions = await Promise.all(
    published.map((d) =>
      d.currentPublishedVersionId
        ? repo.findVersionById(db, d.currentPublishedVersionId)
        : Promise.resolve(undefined),
    ),
  );

  return published.map((d, idx) => ({
    definition: d,
    version: versions[idx],
  }));
}

export async function getStoryVersionGraph(storyVersionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const version = await repo.findVersionById(db, storyVersionId);
  if (!version) {
    throw new NotFoundError("StoryVersion", storyVersionId);
  }
  const definition = await repo.findDefinitionById(
    db,
    version.storyDefinitionId,
  );
  const scenes = await repo.findScenesByVersion(db, storyVersionId);
  const transitions = await repo.findTransitionsByVersion(db, storyVersionId);
  return {
    definition: definition ?? null,
    version,
    scenes,
    transitions,
  };
}

export async function getStoryVersionGraphByNumber(
  storyDefinitionId: string,
  versionNumber: number,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const version = await repo.findVersionByDefinitionAndNumber(
    db,
    storyDefinitionId,
    versionNumber,
  );
  if (!version) {
    throw new NotFoundError(
      "StoryVersion",
      `${storyDefinitionId}#${versionNumber}`,
    );
  }
  return getStoryVersionGraph(version.id);
}

export async function getStoryDefinitionById(storyDefinitionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findDefinitionById(db, storyDefinitionId);
  if (!record) {
    throw new NotFoundError("StoryDefinition", storyDefinitionId);
  }
  return record;
}

export async function getStoryVersionById(storyVersionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const record = await repo.findVersionById(db, storyVersionId);
  if (!record) {
    throw new NotFoundError("StoryVersion", storyVersionId);
  }
  return record;
}
