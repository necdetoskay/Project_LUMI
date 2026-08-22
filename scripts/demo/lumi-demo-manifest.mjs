export const LUMI_DEMO_MANIFEST_VERSION = "lumi-demo-v1";
export const LUMI_DEMO_NAMESPACE = "lumi-demo";

export const LUMI_DEMO_MANIFEST = Object.freeze({
  manifestVersion: LUMI_DEMO_MANIFEST_VERSION,
  namespace: LUMI_DEMO_NAMESPACE,
  locale: "tr-TR",
  household: {
    id: "51000000-0000-4000-8000-000000000001",
    key: "lumi-demo-household",
    displayName: "LUMI Demo Ailesi",
  },
  childProfile: {
    id: "51000000-0000-4000-8000-000000000002",
    key: "elif",
    displayName: "Elif",
    age: 7,
    interests: ["doğa", "hayvanlar", "keşif", "ışıklar"],
  },
  character: {
    id: "51000000-0000-4000-8000-000000000003",
    key: "lina",
    displayName: "Lina",
    originKey: "isik-vadisi-gezgini",
    originPackageId: "51000000-0000-4000-8000-000000000005",
    broadKind: "human",
    characterType: "explorer",
    subtype: "child",
    lifecycleStage: "childhood",
    visualCanonStatus: "not_generated",
  },
  world: {
    id: "51000000-0000-4000-8000-000000000004",
    key: "isik-vadisi",
    displayName: "Işık Vadisi",
    universeSeed: "lumi-demo-isik-vadisi-v1",
    originSeed: "lumi-demo-lina-origin-v1",
    acceptedCandidateSeed: "lumi-demo-isik-vadisi-candidate-v1",
    generatorVersion: "demo-reference-v1",
    vectorVersion: "demo-reference-v1",
    startLocationKey: "fisildayan-orman",
  },
  regions: [
    {
      id: "51000000-0000-4000-8000-000000000010",
      key: "isik-vadisi-merkez",
      displayName: "Işık Vadisi",
      type: "forest",
      discoveryStatus: "explored",
      accessibilityStatus: "open",
      sortOrder: 0,
    },
  ],
  locations: [
    {
      id: "51000000-0000-4000-8000-000000000020",
      key: "fisildayan-orman",
      regionKey: "isik-vadisi-merkez",
      displayName: "Fısıldayan Orman",
      type: "forest",
      accessibilityStatus: "open",
      isHome: false,
      sortOrder: 0,
    },
    {
      id: "51000000-0000-4000-8000-000000000021",
      key: "atesbocekleri-korusu",
      regionKey: "isik-vadisi-merkez",
      displayName: "Ateşböcekleri Korusu",
      type: "grove",
      accessibilityStatus: "open",
      isHome: false,
      sortOrder: 1,
    },
    {
      id: "51000000-0000-4000-8000-000000000022",
      key: "eski-tas-kopru",
      regionKey: "isik-vadisi-merkez",
      displayName: "Eski Taş Köprü",
      type: "bridge",
      accessibilityStatus: "open",
      isHome: false,
      sortOrder: 2,
    },
    {
      id: "51000000-0000-4000-8000-000000000023",
      key: "ay-golu",
      regionKey: "isik-vadisi-merkez",
      displayName: "Ay Gölü",
      type: "lake",
      accessibilityStatus: "open",
      isHome: false,
      sortOrder: 3,
    },
    {
      id: "51000000-0000-4000-8000-000000000024",
      key: "linanin-evi",
      regionKey: "isik-vadisi-merkez",
      displayName: "Lina'nın Evi",
      type: "home",
      accessibilityStatus: "open",
      isHome: true,
      sortOrder: 4,
    },
  ],
  connections: [
    { from: "fisildayan-orman", to: "atesbocekleri-korusu", type: "path" },
    { from: "fisildayan-orman", to: "linanin-evi", type: "path" },
    { from: "atesbocekleri-korusu", to: "eski-tas-kopru", type: "path" },
    { from: "eski-tas-kopru", to: "ay-golu", type: "path" },
  ],
  npcs: [
    {
      id: "51000000-0000-4000-8000-000000000030",
      key: "mira",
      displayName: "Mira",
      role: "orman-rehberi",
      originPackageId: "51000000-0000-4000-8000-000000000033",
      broadKind: "human",
      characterType: "helper",
      subtype: "forest-guide",
      lifecycleStage: "adulthood",
      locationKey: "fisildayan-orman",
      relationshipToCharacter: 0.35,
      traits: ["meraklı", "sakin", "yardımsever"],
    },
    {
      id: "51000000-0000-4000-8000-000000000031",
      key: "tiko",
      displayName: "Tiko",
      role: "tilki",
      originPackageId: "51000000-0000-4000-8000-000000000034",
      broadKind: "animal",
      characterType: "explorer",
      subtype: "fox",
      lifecycleStage: "childhood",
      locationKey: "atesbocekleri-korusu",
      relationshipToCharacter: 0.2,
      traits: ["hareketli", "oyuncu", "dikkatli"],
    },
    {
      id: "51000000-0000-4000-8000-000000000032",
      key: "yasli-mese",
      displayName: "Yaşlı Meşe",
      role: "hafiza-koruyucusu",
      originPackageId: "51000000-0000-4000-8000-000000000035",
      broadKind: "fantasy",
      characterType: "storyteller",
      subtype: "ancient-tree",
      lifecycleStage: "elder",
      locationKey: "eski-tas-kopru",
      relationshipToCharacter: 0.1,
      traits: ["bilge", "sabırlı", "gözlemci"],
    },
  ],
  inventory: [
    {
      id: "51000000-0000-4000-8000-000000000040",
      key: "parlayan-pusula",
      displayName: "Parlayan Pusula",
      description:
        "Yakındaki önemli yolları hafifçe ışıldayarak işaret eden küçük bir pusula.",
    },
    {
      id: "51000000-0000-4000-8000-000000000041",
      key: "mese-yapragi",
      displayName: "Meşe Yaprağı",
      description:
        "Yaşlı Meşe'den kalmış, Lina için anlamı olan kuru bir yaprak.",
    },
  ],
  memories: [
    {
      id: "51000000-0000-4000-8000-000000000050",
      key: "mira-lina-ilk-karsilasma",
      npcKey: "mira",
      kind: "direct_observation",
      summary:
        "Mira, Lina'nın Fısıldayan Orman'a korkmadan ama dikkatle girdiğini hatırlıyor.",
      salience: 0.65,
      durable: true,
    },
    {
      id: "51000000-0000-4000-8000-000000000051",
      key: "tiko-parlayan-isiklar",
      npcKey: "tiko",
      kind: "direct_observation",
      summary:
        "Tiko, Lina'nın ateşböceklerini görünce onları takip etmek yerine önce çevreyi incelediğini hatırlıyor.",
      salience: 0.5,
      durable: false,
    },
  ],
  quest: {
    id: "51000000-0000-4000-8000-000000000060",
    key: "kayip-isik-izi",
    title: "Kayıp Işık İzini Bul",
    summary: "Ormanda giderek solan küçük ışıkların nereye gittiğini keşfet.",
    status: "active",
  },
  story: {
    definitionId: "51000000-0000-4000-8000-000000000070",
    versionId: "51000000-0000-4000-8000-000000000071",
    sessionId: "51000000-0000-4000-8000-000000000072",
    key: "fisildayan-ormandaki-ilk-isik",
    title: "Fısıldayan Ormandaki İlk Işık",
    openingLocationKey: "fisildayan-orman",
    openingNpcKey: "mira",
  },
});

export function validateLumiDemoManifest(manifest = LUMI_DEMO_MANIFEST) {
  const errors = [];
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i;
  const broadKinds = new Set([
    "human",
    "animal",
    "fantasy",
    "robot",
    "sea_creature",
    "sky_creature",
  ]);
  const characterTypes = new Set([
    "explorer",
    "inventor",
    "storyteller",
    "helper",
    "dreamer",
  ]);
  const lifecycleStages = new Set([
    "newborn",
    "childhood",
    "adolescence",
    "adulthood",
    "elder",
  ]);

  if (manifest.manifestVersion !== LUMI_DEMO_MANIFEST_VERSION) {
    errors.push("manifestVersion must match LUMI_DEMO_MANIFEST_VERSION");
  }
  if (manifest.namespace !== LUMI_DEMO_NAMESPACE) {
    errors.push("namespace must match LUMI_DEMO_NAMESPACE");
  }

  const ids = [];
  const collectId = (label, id) => {
    if (!uuidPattern.test(id))
      errors.push(`${label} has invalid stable UUID '${id}'`);
    ids.push([label, id]);
  };

  collectId("household", manifest.household.id);
  collectId("childProfile", manifest.childProfile.id);
  collectId("character", manifest.character.id);
  collectId("character.originPackage", manifest.character.originPackageId);
  collectId("world", manifest.world.id);
  for (const region of manifest.regions)
    collectId(`region:${region.key}`, region.id);
  for (const location of manifest.locations)
    collectId(`location:${location.key}`, location.id);
  for (const npc of manifest.npcs) {
    collectId(`npc:${npc.key}`, npc.id);
    collectId(`npc:${npc.key}.originPackage`, npc.originPackageId);
  }
  for (const item of manifest.inventory)
    collectId(`inventory:${item.key}`, item.id);
  for (const memory of manifest.memories)
    collectId(`memory:${memory.key}`, memory.id);
  collectId("quest", manifest.quest.id);
  collectId("story.definition", manifest.story.definitionId);
  collectId("story.version", manifest.story.versionId);
  collectId("story.session", manifest.story.sessionId);

  const seenIds = new Map();
  for (const [label, id] of ids) {
    if (seenIds.has(id))
      errors.push(`${label} duplicates stable UUID used by ${seenIds.get(id)}`);
    else seenIds.set(id, label);
  }

  const assertUniqueKeys = (label, values) => {
    const seen = new Set();
    for (const value of values) {
      if (seen.has(value))
        errors.push(`${label} contains duplicate key '${value}'`);
      seen.add(value);
    }
  };

  assertUniqueKeys(
    "regions",
    manifest.regions.map((entry) => entry.key),
  );
  assertUniqueKeys(
    "locations",
    manifest.locations.map((entry) => entry.key),
  );
  assertUniqueKeys(
    "npcs",
    manifest.npcs.map((entry) => entry.key),
  );
  assertUniqueKeys(
    "inventory",
    manifest.inventory.map((entry) => entry.key),
  );
  assertUniqueKeys(
    "memories",
    manifest.memories.map((entry) => entry.key),
  );

  const regionKeys = new Set(manifest.regions.map((entry) => entry.key));
  const locationKeys = new Set(manifest.locations.map((entry) => entry.key));
  const npcKeys = new Set(manifest.npcs.map((entry) => entry.key));

  const validateCharacterIdentity = (label, identity) => {
    if (!broadKinds.has(identity.broadKind)) {
      errors.push(`${label}.broadKind '${identity.broadKind}' is invalid`);
    }
    if (!characterTypes.has(identity.characterType)) {
      errors.push(
        `${label}.characterType '${identity.characterType}' is invalid`,
      );
    }
    if (!identity.subtype || typeof identity.subtype !== "string") {
      errors.push(`${label}.subtype is required`);
    }
    if (!lifecycleStages.has(identity.lifecycleStage)) {
      errors.push(
        `${label}.lifecycleStage '${identity.lifecycleStage}' is invalid`,
      );
    }
  };

  validateCharacterIdentity("character", manifest.character);

  if (!locationKeys.has(manifest.world.startLocationKey)) {
    errors.push(
      `world.startLocationKey '${manifest.world.startLocationKey}' does not exist`,
    );
  }
  if (!locationKeys.has(manifest.story.openingLocationKey)) {
    errors.push(
      `story.openingLocationKey '${manifest.story.openingLocationKey}' does not exist`,
    );
  }
  if (!npcKeys.has(manifest.story.openingNpcKey)) {
    errors.push(
      `story.openingNpcKey '${manifest.story.openingNpcKey}' does not exist`,
    );
  }

  for (const location of manifest.locations) {
    if (!regionKeys.has(location.regionKey)) {
      errors.push(
        `location '${location.key}' references missing region '${location.regionKey}'`,
      );
    }
  }
  for (const connection of manifest.connections) {
    if (!locationKeys.has(connection.from)) {
      errors.push(`connection.from '${connection.from}' does not exist`);
    }
    if (!locationKeys.has(connection.to)) {
      errors.push(`connection.to '${connection.to}' does not exist`);
    }
    if (connection.from === connection.to) {
      errors.push(`connection '${connection.from}' cannot point to itself`);
    }
  }
  for (const npc of manifest.npcs) {
    validateCharacterIdentity(`npc '${npc.key}'`, npc);
    if (!locationKeys.has(npc.locationKey)) {
      errors.push(
        `npc '${npc.key}' references missing location '${npc.locationKey}'`,
      );
    }
    if (npc.relationshipToCharacter < -1 || npc.relationshipToCharacter > 1) {
      errors.push(
        `npc '${npc.key}' relationshipToCharacter must be within [-1, 1]`,
      );
    }
  }
  for (const memory of manifest.memories) {
    if (!npcKeys.has(memory.npcKey)) {
      errors.push(
        `memory '${memory.key}' references missing npc '${memory.npcKey}'`,
      );
    }
    if (memory.salience < 0 || memory.salience > 1) {
      errors.push(`memory '${memory.key}' salience must be within [0, 1]`);
    }
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
