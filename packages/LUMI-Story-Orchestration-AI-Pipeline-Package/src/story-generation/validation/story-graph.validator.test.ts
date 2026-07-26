import { describe, expect, it } from "vitest";
import { validateStoryGraph } from "./story-graph.validator";

describe("story graph validator", () => {
  it("accepts reachable graph with ending", () => {
    const result = validateStoryGraph({
      title: "Test",
      summary: "Test summary",
      ageBand: "6-8",
      themes: [],
      startNodeKey: "start",
      metadata: {},
      questions: [],
      nodes: [
        {
          key: "start",
          nodeType: "choice",
          body: "Choose",
          ambience: [],
          choices: [
            {
              key: "a",
              label: "A",
              nextNodeKey: "end-a",
              effects: {},
            },
            {
              key: "b",
              label: "B",
              nextNodeKey: "end-b",
              effects: {},
            },
          ],
        },
        {
          key: "end-a",
          nodeType: "ending",
          body: "End A",
          ambience: [],
          choices: [],
        },
        {
          key: "end-b",
          nodeType: "ending",
          body: "End B",
          ambience: [],
          choices: [],
        },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("rejects missing next node", () => {
    const result = validateStoryGraph({
      title: "Test",
      summary: "Test summary",
      ageBand: "6-8",
      themes: [],
      startNodeKey: "start",
      metadata: {},
      questions: [],
      nodes: [
        {
          key: "start",
          nodeType: "choice",
          body: "Choose",
          ambience: [],
          choices: [
            {
              key: "a",
              label: "A",
              nextNodeKey: "missing",
              effects: {},
            },
            {
              key: "b",
              label: "B",
              nextNodeKey: "missing-2",
              effects: {},
            },
          ],
        },
      ],
    });

    expect(result.valid).toBe(false);
  });
});
