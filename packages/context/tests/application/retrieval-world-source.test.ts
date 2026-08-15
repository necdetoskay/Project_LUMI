import { describe, expect, it } from "vitest";

import { RetrievalWorldEventSource } from "../../src/adapters";
import type { ContextRetrievalSource } from "../../src/ports";
import { testRequest } from "../fixtures/contexts";

describe("RetrievalWorldEventSource", () => {
  it("maps retrieved world events into canonical semantic items", async () => {
    const retrieval: ContextRetrievalSource = {
      retrieve: async () => ({
        candidates: [{ stableId: "event:storm", sourceKind: "world-event", summary: "A crystal storm is approaching the floating islands.", relevance: 0.92, provenance: { authority: "world-event-store", recordId: "event:storm" } }],
      }),
    };
    const result = await new RetrievalWorldEventSource(retrieval).fetch({ ...testRequest, sceneFocus: "Crystal Islands" });
    expect(result.items.map((item) => item.id)).toEqual(["world:location", "world:visible-changes", "world:environment"]);
    expect(result.items[0]?.text).toContain("Crystal Islands");
    expect(result.items[1]?.text).toContain("crystal storm");
    expect(result.items.every((item) => item.sourceEngine === "world-event-retrieval")).toBe(true);
  });
});
