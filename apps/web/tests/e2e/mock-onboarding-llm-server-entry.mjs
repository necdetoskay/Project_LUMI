import { createServer } from "node:http";

const port = Number(process.env.MOCK_OPENROUTER_PORT ?? 18998);
let requestCount = 0;

function suggestionsFor(prompt) {
  if (prompt.includes("Create exactly 4 distinct identity candidates")) {
    return [
      { key: "identity-1", name: "Luna Starwhisperer", identity: "A gentle starlight listener who discovers hidden melodies in crystals.", traits: ["curious", "kind", "creative"], fitReason: "A fantastic character shaped for wonder, exploration, and gentle discovery." },
      { key: "identity-2", name: "Mira Glowfin", identity: "A luminous dream guide who reads friendly patterns in moonlit water.", traits: ["patient", "bright", "playful"], fitReason: "A fantastic identity with strong ocean and discovery possibilities." },
      { key: "identity-3", name: "Piko Cloudseed", identity: "A tiny sky gardener who grows floating flowers from songs and stories.", traits: ["inventive", "warm", "hopeful"], fitReason: "A child-safe fantasy identity with many long-running story hooks." },
      { key: "identity-4", name: "Neri Crystalwing", identity: "A crystal-winged explorer who maps echoes inside glowing caverns.", traits: ["observant", "brave", "gentle"], fitReason: "A fantastic explorer naturally connected to crystals and discovery." },
    ];
  }
  if (prompt.includes("Create exactly 4 diverse world candidates")) {
    return [
      { key: "world-1", name: "Starglow Forest", description: "A vast forest where crystal trees store songs from stars and release them at dusk.", ecology: "Crystal trees, lantern moths, moss libraries, and gentle river creatures share energy through light.", climate: "Warm days with cool luminous evenings and soft seasonal rains.", magicTechnology: "Starlight can be stored in crystals and shaped only through music, care, and patient practice.", adventureTone: "Wonder-filled exploration, discovery, friendship, and gentle mysteries." },
      { key: "world-2", name: "Tideglass Archipelago", description: "Floating islands of sea glass drift above a bright ocean connected by singing currents.", ecology: "Reef gardens, sky whales, tide birds, and floating orchards form a balanced island ecosystem.", climate: "Mild ocean winds, sparkling rain, and long golden mornings.", magicTechnology: "Glass compasses respond to memories and currents without controlling living creatures.", adventureTone: "Ocean discovery, navigation puzzles, and community adventures." },
      { key: "world-3", name: "Cloudroot Vale", description: "A valley suspended between clouds where giant roots connect villages and hidden observatories.", ecology: "Cloud deer, root gardens, wind bees, and hanging forests thrive together.", climate: "Fresh breezes, gentle mist, and bright clear afternoons.", magicTechnology: "Wind instruments guide bridges and lifts through cooperative melodies.", adventureTone: "Sky exploration, inventive travel, and playful mysteries." },
      { key: "world-4", name: "Moonpetal Basin", description: "A peaceful basin of moonlit lakes where flowers open paths to forgotten gardens.", ecology: "Moonpetal fields, silver fish, friendly beetles, and lakeside orchards support one another.", climate: "Calm nights, mild days, and regular silver dew.", magicTechnology: "Petal maps reveal routes when travelers share truthful questions.", adventureTone: "Reflective discovery, garden mysteries, and warm friendships." },
    ];
  }
  if (prompt.includes("Return exactly one compatibility assessment")) {
    return [{ key: "compatibility-1", classification: "natural", explanation: "The selected fantastic character naturally belongs in this world because its crystal and starlight ecology supports the character's abilities without requiring a forced exception." }];
  }
  if (prompt.includes("Create exactly 4 region candidates")) {
    return [
      { key: "region-1", name: "Whispering Crystal Glades", biome: "Luminous crystal woodland and shallow singing streams", tone: "Curious, welcoming, and quietly magical", mystery: "One ancient crystal tree has begun humming a melody that no local creature remembers.", description: "A sheltered glade where crystal trees form natural arches around streams, small homes, and paths that glow after sunset." },
      { key: "region-2", name: "Lantern Moss Terraces", biome: "Layered moss gardens beneath giant roots", tone: "Cozy, inventive, and communal", mystery: "The oldest lantern moss has started pointing toward an unused bridge hidden under the roots.", description: "Terraced gardens climb through huge roots, linking workshops, tiny libraries, and gathering spaces with soft green light." },
      { key: "region-3", name: "Starfall Brook", biome: "Clear brook valley with crystal pebbles and flowering banks", tone: "Playful, musical, and exploratory", mystery: "Every seventh evening the brook carries a new sequence of notes from somewhere upstream.", description: "A broad stream winds through flower meadows and crystal stones, with safe stepping paths and observation huts along the banks." },
      { key: "region-4", name: "Moonfern Hollow", biome: "Fern hollow beneath translucent crystal canopy", tone: "Gentle, thoughtful, and mysterious", mystery: "A ring of moonferns opens only when someone repeats a forgotten but friendly question.", description: "A quiet hollow of silver ferns and translucent branches where families collect dew, stories, and night-blooming seeds." },
    ];
  }
  if (prompt.includes("Create exactly 4 distinct origin candidates")) {
    return [
      { key: "origin-1", title: "Starlight Weaver", origin: "Luna learned to weave tiny threads of starlight while helping the glade's crystal keepers catalogue evening songs.", home: "A round tree-home beside the central singing stream, shared with a small workshop and reading nook.", formativeExperience: "She once matched a lost melody to a crystal seed and discovered that patient listening can reveal paths others miss.", storyHook: "A newly awakened crystal carries half of a melody that seems connected to places far beyond the glade." },
      { key: "origin-2", title: "Keeper of Small Echoes", origin: "Luna grew up collecting harmless echoes that fell from crystal branches after festivals.", home: "A cozy lantern loft above a community music garden.", formativeExperience: "She returned a forgotten tune to an elderly gardener by carefully piecing together its echoes.", storyHook: "An echo has arrived before the sound that should have created it." },
      { key: "origin-3", title: "Moonstream Listener", origin: "Luna spent her early years beside a moonlit stream learning how water changes the songs held in crystals.", home: "A small bridge-house with windows opening over the stream.", formativeExperience: "She helped two neighboring gardens understand the same melody in different ways.", storyHook: "The stream has started carrying a melody from a region not connected to its waters." },
      { key: "origin-4", title: "Garden Constellation Mapper", origin: "Luna learned to map patterns formed by glowing flowers and overhead stars.", home: "A flower observatory built into a broad crystal root.", formativeExperience: "She discovered that one missing star-pattern corresponded to an unopened garden path.", storyHook: "A new constellation appears only inside crystal reflections." },
    ];
  }
  if (prompt.includes("Create exactly 4 Core Saga candidates")) {
    return [
      { key: "saga-1", title: "The Lost Melody of the Crystal Glades", premise: "Luna discovers that fragments of an old melody are appearing across the world, each revealing how distant communities are connected.", longTermGoal: "Recover and understand the full melody while helping each place preserve its own voice.", motivation: "Luna wants to understand why the glade's oldest crystal recognized her listening pattern.", themes: ["curiosity", "belonging", "cooperation"], futureBranches: ["Follow a melody fragment across a new region", "Help a community interpret its unique verse", "Discover why some crystals remember future sounds"], specificity: "The saga grows directly from Luna's starlight listening, the Whispering Crystal Glades, and the half-melody in her origin." },
      { key: "saga-2", title: "Paths Written in Light", premise: "Changing crystal lights reveal a network of forgotten but peaceful travel paths between distant regions.", longTermGoal: "Map the paths and learn why they are returning now.", motivation: "Luna believes every new path can connect friends who have never met.", themes: ["exploration", "friendship", "memory"], futureBranches: ["Restore a dim path", "Compare two conflicting maps", "Guide a festival exchange"], specificity: "The journey depends on crystal ecology, starlight rules, and Luna's patient observation." },
      { key: "saga-3", title: "The Gardens That Answer", premise: "Hidden gardens begin answering thoughtful questions with changing flowers, sounds, and paths.", longTermGoal: "Learn the gardens' language without turning their answers into rigid rules.", motivation: "Luna is fascinated by how listening changes what the gardens choose to reveal.", themes: ["wonder", "care", "interpretation"], futureBranches: ["Meet a garden with a new dialect", "Resolve two different interpretations", "Protect a garden's right to remain quiet"], specificity: "The saga extends the world's living ecology and Luna's identity as a listener." },
      { key: "saga-4", title: "Constellation of Neighbors", premise: "Communities across the world discover that their local lights form parts of one enormous changing constellation.", longTermGoal: "Help communities share discoveries and understand the constellation together.", motivation: "Luna wants every region to contribute without losing what makes it unique.", themes: ["community", "discovery", "identity"], futureBranches: ["Visit a new constellation point", "Build a shared observation ritual", "Investigate a star that moves between regions"], specificity: "The saga ties Luna, her crystal home, the selected region, and the wider universe into one evolving pattern." },
    ];
  }
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
    if (!suggestions) return send(res, 400, { error: { message: "Unknown canonical onboarding prompt" } });
    requestCount += 1;
    const content = JSON.stringify({ suggestions });
    return send(res, 200, {
      id: `mock-onboarding-${requestCount}`,
      model: "mock/canonical-onboarding",
      choices: [{ finish_reason: "stop", message: { role: "assistant", content } }],
      usage: { prompt_tokens: 180, completion_tokens: 420, total_tokens: 600 },
    });
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Canonical onboarding mock OpenRouter running on ${port}`);
});
