import { createServer } from "node:http";

const port = Number(process.env.MOCK_OPENROUTER_PORT ?? 18999);
let archetypeGeneration = 0;
let failuresRemaining = 0;
const requests = [];

const initialArchetypes = [
  { canonicalType: "explorer", title: "Nebula Cartographer", description: "Maps luminous paths between distant floating islands", personalityHook: "Curious and calm when routes disappear", storyPromise: "Every map reveals a surprising new friendship", themeTags: ["maps", "stars", "discovery"] },
  { canonicalType: "inventor", title: "Echo Workshop Inventor", description: "Builds gentle machines that collect forgotten sounds", personalityHook: "Patiently turns mistakes into useful inventions", storyPromise: "Broken objects become helpers for the whole village", themeTags: ["invention", "sound", "teamwork"] },
  { canonicalType: "storyteller", title: "Lantern Tale Keeper", description: "Carries stories inside lanterns that glow when shared", personalityHook: "Listens carefully before beginning every tale", storyPromise: "Shared stories open doors into welcoming worlds", themeTags: ["stories", "lanterns", "kindness"] },
  { canonicalType: "helper", title: "Bridge Garden Guardian", description: "Grows colorful bridges wherever neighbors need help", personalityHook: "Notices quiet problems and invites everyone to help", storyPromise: "Small acts of care connect distant communities", themeTags: ["helping", "gardens", "community"] },
  { canonicalType: "dreamer", title: "Cloud Music Dreamer", description: "Shapes soft clouds into instruments for sky concerts", personalityHook: "Finds hopeful melodies in ordinary moments", storyPromise: "Dreams become songs that guide travelers home", themeTags: ["dreams", "music", "clouds"] },
];

const regeneratedArchetypes = [
  { canonicalType: "explorer", title: "Coral Compass Diver", description: "Follows friendly currents through a bright underwater library", personalityHook: "Brave enough to ask sea creatures for directions", storyPromise: "Lost pages lead to hidden reef celebrations", themeTags: ["ocean", "books", "navigation"] },
  { canonicalType: "inventor", title: "Moonlight Kite Engineer", description: "Designs clever kites that carry messages after sunset", personalityHook: "Tests every idea with patience and good humor", storyPromise: "Night winds deliver solutions across the valley", themeTags: ["kites", "engineering", "night"] },
  { canonicalType: "storyteller", title: "River Memory Singer", description: "Learns gentle songs from rivers and shares their memories", personalityHook: "Values every voice and remembers tiny details", storyPromise: "Old melodies reunite friends along the riverbank", themeTags: ["rivers", "songs", "memory"] },
  { canonicalType: "helper", title: "Pocket Weather Guide", description: "Carries a tiny forecast kit to help outdoor celebrations", personalityHook: "Prepares carefully and stays cheerful when plans change", storyPromise: "Unexpected weather becomes a shared adventure", themeTags: ["weather", "planning", "celebration"] },
  { canonicalType: "dreamer", title: "Clockwork Seed Dreamer", description: "Plants mechanical seeds that bloom into playful sculptures", personalityHook: "Imagines patient solutions before turning the first gear", storyPromise: "A quiet garden grows into a surprising art festival", themeTags: ["seeds", "sculpture", "imagination"] },
];

const autoPackages = [
  { broadKind: "human", subtype: "Starlight Route Finder", originConcept: "A careful mapmaker discovers a path that appears only during kind conversations", startingRegionArchetype: "floating observatory", startingLocation: "sunrise map room", homeArchetype: "warm tower studio", nearbyNpcSeed: "patient telescope keeper", firstMysterySeed: "a constellation with one missing light", toneVector: ["wonder", "curiosity"], noveltyMarkers: ["singing compass", "folding sky map"] },
  { broadKind: "animal", subtype: "Whispering Meadow Rabbit", originConcept: "A small rabbit follows friendly echoes to reconnect neighboring gardens", startingRegionArchetype: "whispering meadow", startingLocation: "clover gate", homeArchetype: "round hillside burrow", nearbyNpcSeed: "cheerful seed merchant", firstMysterySeed: "footprints that stop beside a flower", toneVector: ["warmth", "humor"], noveltyMarkers: ["echo scarf", "pollen postcards"] },
  { broadKind: "fantasy", subtype: "Lantern Reef Apprentice", originConcept: "A young light keeper learns why the reef lanterns change color", startingRegionArchetype: "lantern reef", startingLocation: "safe tide balcony", homeArchetype: "shell window cottage", nearbyNpcSeed: "gentle coral librarian", firstMysterySeed: "a lantern glowing at noon", toneVector: ["wonder", "mystery"], noveltyMarkers: ["color compass", "bubble archive"] },
  { broadKind: "robot", subtype: "Kindhearted Repair Rover", originConcept: "A repair rover helps a village prepare its floating music festival", startingRegionArchetype: "workshop valley", startingLocation: "community repair bench", homeArchetype: "copper roof charging nook", nearbyNpcSeed: "retired music box maker", firstMysterySeed: "a gear that hums a forgotten tune", toneVector: ["courage", "curiosity"], noveltyMarkers: ["rhythm toolkit", "friendly indicator lights"] },
];

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/__mock/reset") {
    archetypeGeneration = 0;
    failuresRemaining = 0;
    requests.length = 0;
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === "POST" && req.url === "/__mock/fail-next") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsed = body ? JSON.parse(body) : {};
      failuresRemaining = Number(parsed.count ?? 1);
      sendJson(res, 200, { failuresRemaining });
    });
    return;
  }
  if (req.method === "GET" && req.url === "/__mock/state") {
    return sendJson(res, 200, { archetypeGeneration, failuresRemaining, requests });
  }
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    return sendJson(res, 404, { error: "not_found" });
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const parsed = JSON.parse(body);
    const prompt = parsed.messages?.find((message) => message.role === "user")?.content ?? "";
    const kind = prompt.includes("Origin modu:") ? "origin" : "archetype";
    requests.push({ kind, prompt, model: parsed.model });

    if (failuresRemaining > 0) {
      failuresRemaining--;
      return sendJson(res, 500, { error: { code: "mock_failure", message: "Mock OpenRouter failure" } });
    }

    if (kind === "archetype") {
      const archetypes = archetypeGeneration++ === 0 ? initialArchetypes : regeneratedArchetypes;
      return sendJson(res, 200, {
        choices: [{ message: { content: JSON.stringify({ archetypes }) } }],
        model: "mock-archetype-model-v1",
      });
    }

    const isAuto = prompt.includes("Origin modu: auto");
    const characterType = prompt.match(/Karakter tipi:\s*(\w+)/)?.[1] ?? "explorer";
    const packages = (isAuto ? autoPackages : [autoPackages[0]]).map((candidate) => ({
      ...candidate,
      characterType,
    }));
    return sendJson(res, 200, {
      choices: [{ message: { content: JSON.stringify({ packages }) } }],
      model: "mock-origin-model-v1",
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock OpenRouter server running on port ${port}`);
});