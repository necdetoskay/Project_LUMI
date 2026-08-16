import { createServer } from "node:http";

const port = Number(process.env.MOCK_OPENROUTER_PORT ?? 18998);
let requestCount = 0;

const identity = [
  { key: "identity-1", name: "Luna Starwhisperer", identity: "A gentle starlight listener who discovers hidden melodies in crystals.", traits: ["curious", "kind", "creative"], fitReason: "A fantastic character shaped for wonder, exploration, and gentle discovery." },
  { key: "identity-2", name: "Mira Glowfin", identity: "A luminous dream guide who reads friendly patterns in moonlit water.", traits: ["patient", "bright", "playful"], fitReason: "A fantastic identity with strong ocean and discovery possibilities." },
  { key: "identity-3", name: "Piko Cloudseed", identity: "A tiny sky gardener who grows floating flowers from songs and stories.", traits: ["inventive", "warm", "hopeful"], fitReason: "A child-safe fantasy identity with many long-running story hooks." },
  { key: "identity-4", name: "Neri Crystalwing", identity: "A crystal-winged explorer who maps echoes inside glowing caverns.", traits: ["observant", "brave", "gentle"], fitReason: "A fantastic explorer naturally connected to crystals and discovery." },
];

const worlds = [
  { key: "world-1", name: "Starglow Forest", description: "A vast forest where crystal trees store songs from stars and release them at dusk.", ecology: "Crystal trees, lantern moths, moss libraries, and gentle river creatures share energy through light.", climate: "Warm days with cool luminous evenings and soft seasonal rains.", magicTechnology: "Starlight can be stored in crystals and shaped through music, care, and patient practice.", adventureTone: "Wonder-filled exploration, discovery, friendship, and gentle mysteries." },
  { key: "world-2", name: "Tideglass Archipelago", description: "Floating islands of sea glass drift above a bright ocean connected by singing currents.", ecology: "Reef gardens, sky whales, tide birds, and floating orchards form a balanced island ecosystem.", climate: "Mild ocean winds, sparkling rain, and long golden mornings.", magicTechnology: "Glass compasses respond to memories and currents without controlling living creatures.", adventureTone: "Ocean discovery, navigation puzzles, and community adventures." },
  { key: "world-3", name: "Cloudroot Vale", description: "A valley suspended between clouds where giant roots connect villages and hidden observatories.", ecology: "Cloud deer, root gardens, wind bees, and hanging forests thrive together.", climate: "Fresh breezes, gentle mist, and bright clear afternoons.", magicTechnology: "Wind instruments guide bridges and lifts through cooperative melodies.", adventureTone: "Sky exploration, inventive travel, and playful mysteries." },
  { key: "world-4", name: "Moonpetal Basin", description: "A peaceful basin of moonlit lakes where flowers open paths to forgotten gardens.", ecology: "Moonpetal fields, silver fish, friendly beetles, and lakeside orchards support one another.", climate: "Calm nights, mild days, and regular silver dew.", magicTechnology: "Petal maps reveal routes when travelers share truthful questions.", adventureTone: "Reflective discovery, garden mysteries, and warm friendships." },
];

const compatibility = [
  { key: "compatibility-1", classification: "natural", explanation: "The selected fantastic character naturally belongs in this world because its crystal and starlight ecology supports the character's abilities without requiring a forced exception.", adaptationPremise: "" },
];

const regions = [
  { key: "region-1", name: "Whispering Crystal Glades", biome: "Luminous crystal woodland and singing streams", tone: "Curious, welcoming, quietly magical", mystery: "One ancient crystal tree hums a melody that no local creature remembers.", description: "A sheltered glade where crystal trees form natural arches around streams, homes, and paths that glow after sunset." },
  { key: "region-2", name: "Lantern Moss Terraces", biome: "Layered moss gardens beneath giant roots", tone: "Cozy, inventive, communal", mystery: "The oldest lantern moss points toward an unused bridge hidden under the roots.", description: "Terraced gardens climb through huge roots, linking workshops, libraries, and gathering spaces with soft green light." },
  { key: "region-3", name: "Starfall Brook", biome: "Clear brook valley with crystal pebbles", tone: "Playful, musical, exploratory", mystery: "Every seventh evening the brook carries a new sequence of notes from upstream.", description: "A broad stream winds through flower meadows and crystal stones, with stepping paths and observation huts along the banks." },
  { key: "region-4", name: "Moonfern Hollow", biome: "Fern hollow beneath crystal canopy", tone: "Gentle, thoughtful, mysterious", mystery: "A ring of moonferns opens only when someone repeats a forgotten friendly question.", description: "A quiet hollow of silver ferns and translucent branches where families collect dew, stories, and night-blooming seeds." },
];

const origins = [
  { key: "origin-1", title: "Starlight Weaver", origin: "Luna learned to weave tiny threads of starlight while helping the glade's crystal keepers catalogue evening songs.", home: "A round tree-home beside the central singing stream, with a small workshop and reading nook.", formativeExperience: "She matched a lost melody to a crystal seed and learned that patient listening reveals hidden paths.", storyHook: "A newly awakened crystal carries half of a melody connected to places beyond the glade." },
  { key: "origin-2", title: "Keeper of Small Echoes", origin: "Luna grew up collecting harmless echoes that fell from crystal branches after festivals.", home: "A cozy lantern loft above a community music garden.", formativeExperience: "She returned a forgotten tune to a gardener by carefully piecing together its echoes.", storyHook: "An echo has arrived before the sound that should have created it." },
  { key: "origin-3", title: "Moonstream Listener", origin: "Luna spent her early years beside a moonlit stream learning how water changes the songs held in crystals.", home: "A small bridge-house with windows opening over the stream.", formativeExperience: "She helped neighboring gardens understand the same melody in different ways.", storyHook: "The stream carries a melody from a region not connected to its waters." },
  { key: "origin-4", title: "Garden Constellation Mapper", origin: "Luna learned to map patterns formed by glowing flowers and overhead stars.", home: "A flower observatory built into a broad crystal root.", formativeExperience: "She discovered that one missing star-pattern corresponded to an unopened garden path.", storyHook: "A new constellation appears only inside crystal reflections." },
];

const sagas = [
  { key: "saga-1", title: "The Lost Melody of the Crystal Glades", premise: "Luna discovers fragments of an old melody across the world, each revealing how distant communities are connected.", longTermGoal: "Recover and understand the full melody while helping each place preserve its own voice.", motivation: "Luna wants to learn why the glade's oldest crystal recognized her listening pattern.", themes: ["curiosity", "belonging", "cooperation"], futureBranches: ["Follow a melody fragment into a new region", "Help a community interpret its verse", "Discover crystals that remember future sounds"], specificity: "The saga grows from Luna's starlight listening, the Whispering Crystal Glades, and the half-melody in her origin." },
  { key: "saga-2", title: "Paths Written in Light", premise: "Changing crystal lights reveal a network of forgotten but peaceful travel paths between distant regions.", longTermGoal: "Map the paths and learn why they are returning now.", motivation: "Luna believes each new path can connect friends who have never met.", themes: ["exploration", "friendship", "memory"], futureBranches: ["Restore a dim path", "Compare two conflicting maps", "Guide a festival exchange"], specificity: "The journey depends on crystal ecology, starlight rules, and Luna's patient observation." },
  { key: "saga-3", title: "The Gardens That Answer", premise: "Hidden gardens answer thoughtful questions with changing flowers, sounds, and paths.", longTermGoal: "Learn the gardens' language without turning their answers into rigid rules.", motivation: "Luna is fascinated by how listening changes what the gardens reveal.", themes: ["wonder", "care", "interpretation"], futureBranches: ["Meet a garden with a new dialect", "Resolve different interpretations", "Protect a garden's right to remain quiet"], specificity: "The saga extends the world's living ecology and Luna's identity as a listener." },
  { key: "saga-4", title: "Constellation of Neighbors", premise: "Communities discover that their local lights form parts of one enormous changing constellation.", longTermGoal: "Help communities share discoveries and understand the constellation together.", motivation: "Luna wants every region to contribute without losing what makes it unique.", themes: ["community", "discovery", "identity"], futureBranches: ["Visit a new constellation point", "Build a shared observation ritual", "Investigate a star that moves between regions"], specificity: "The saga ties Luna, her crystal home, the selected region, and the wider universe into one evolving pattern." },
];

function suggestionsFor(prompt) {
  if (prompt.includes("distinct identity candidates")) return identity;
  if (prompt.includes("4 world objects") || prompt.includes("diverse world candidates")) return worlds;
  if (prompt.includes("compatibility assessment")) return compatibility;
  if (prompt.includes("4 region objects") || prompt.includes("4 region candidates")) return regions;
  if (prompt.includes("4 origin objects") || prompt.includes("distinct origin candidates")) return origins;
  if (prompt.includes("4 saga objects") || prompt.includes("Core Saga candidates")) return sagas;
  return null;
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) return send(res, 404, { error: "not_found" });
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw);
    const prompt = body.messages?.find((message) => message.role === "user")?.content ?? "";
    const suggestions = suggestionsFor(prompt);
    if (!suggestions) return send(res, 400, { error: { message: `Unknown canonical onboarding prompt: ${prompt.slice(0, 120)}` } });
    requestCount += 1;
    setTimeout(() => {
      send(res, 200, {
        id: `mock-onboarding-${requestCount}`,
        model: "mock/canonical-onboarding",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: JSON.stringify({ suggestions }) } }],
        usage: { prompt_tokens: 180, completion_tokens: 420, total_tokens: 600 },
      });
    }, 250);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Canonical onboarding v2 mock OpenRouter running on ${port}`);
});
