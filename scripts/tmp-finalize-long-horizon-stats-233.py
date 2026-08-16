from pathlib import Path

spec = Path("apps/web/tests/e2e/long-horizon/baseline-onboarding.live.spec.ts")
text = spec.read_text()

world_start = text.index(
    '      const finalWorldState = (await worldMain.innerText()).trim();'
)
world_end_marker = (
    '      const inventoryHeading = page.getByRole("heading", { name: "Çanta" });'
)
world_end = text.index(world_end_marker, world_start)
world_replacement = '''      const finalWorldState = (await worldMain.innerText()).trim();
      evidence.finalWorldState = finalWorldState;

      const worldStatus = normalizeEvidenceText(
        await page
          .getByText("Dunya durumu", { exact: true })
          .locator("xpath=following-sibling::p[1]")
          .innerText(),
        120,
      );
      const currentRegionBadge = page.getByText("Su an burada", {
        exact: true,
      });
      const currentRegion =
        (await currentRegionBadge.count()) > 0 &&
        (await currentRegionBadge.first().isVisible())
          ? normalizeEvidenceText(
              await currentRegionBadge
                .first()
                .locator("xpath=ancestor::article[1]")
                .getByRole("heading")
                .first()
                .innerText(),
              240,
            )
          : "not exposed in current world-map UI";
      const mapSummary = page
        .locator("section")
        .filter({
          has: page.getByRole("heading", {
            name: "Harita ozeti",
            exact: true,
          }),
        })
        .first();
      await expect(mapSummary).toBeVisible({ timeout: 60_000 });
      const currentLocation = normalizeEvidenceText(
        await mapSummary
          .getByText("Su anki konum", { exact: true })
          .locator("xpath=following-sibling::p[1]")
          .innerText(),
        240,
      );
      const inventorySummary = normalizeEvidenceText(
        await mapSummary
          .getByText("Canta", { exact: true })
          .locator("xpath=following-sibling::p[1]")
          .innerText(),
        120,
      );
      const homeBadge = page.locator("span").filter({ hasText: /^Yuva$/ }).first();
      const homeLocation =
        (await homeBadge.count()) > 0 && (await homeBadge.isVisible())
          ? normalizeEvidenceText(
              await homeBadge
                .locator("xpath=ancestor::button[1]")
                .getByRole("heading")
                .first()
                .innerText(),
              240,
            )
          : "not separately exposed in current world-map UI";

      await writeMarkdown(
        config,
        "10-final-world-state.md",
        `# Final World State\n\n- World identity: not exposed as a stable id/name in the current world-map UI\n- World status: ${worldStatus}\n- Current region: ${currentRegion}\n- Current location: ${currentLocation}\n- Home location: ${homeLocation}\n- World events/opportunities: not exposed as a structured final-state list in the current world-map UI\n\n## Full visible world state\n\n${finalWorldState}`,
      );

'''
text = text[:world_start] + world_replacement + text[world_end:]

stats_start = text.index(
    '      await writeMarkdown(\n        config,\n        "15-statistics.md",'
)
stats_end = text.index('\n\n      evidence.status = "completed";', stats_start)
stats_replacement = '''      const sourceDistribution = {
        world_event: stories.filter(
          (story) => story.sourceFamily === "world_event",
        ).length,
        npc_call: stories.filter((story) => story.sourceFamily === "npc_call")
          .length,
        inventory_item: stories.filter(
          (story) => story.sourceFamily === "inventory_item",
        ).length,
        rumor: stories.filter((story) => story.sourceFamily === "rumor")
          .length,
      };
      const persistedStoryCount = stories.filter(
        (story) => story.persistedVerified,
      ).length;
      const continuityFindings = [
        `${persistedStoryCount}/${stories.length} completed stories remained visible in the same child profile history`,
        `${stories.filter((story) => story.narrativeLength >= STORY_MIN_CHARS && story.narrativeLength <= STORY_MAX_CHARS).length}/${stories.length} rendered stories stayed inside the ${STORY_MIN_CHARS}-${STORY_MAX_CHARS} character contract`,
        "Final world, character, inventory and NPC/relationship views rendered through the same browser journey",
        "No deterministic generated-prose equality assertions were used",
      ];
      const generationRetryMetrics =
        "0 test-level story failures on a completed run; provider retry/failure counts are not exposed in the current UI";
      const contextTokenCostMetrics =
        "Context Inspector, token counts and provider-cost metrics are not exposed in the current UI";

      evidence.statistics = {
        childAge: config.childAge,
        characterId,
        worldIdentity:
          "not exposed as a stable id/name in the current world-map UI",
        worldStatus,
        currentRegion,
        currentLocation,
        homeLocation,
        totalStories: stories.length,
        sourceDistribution,
        totalRenderedStoryCharacters: totalNarrativeCharacters,
        storyLengths: stories.map((story) => story.narrativeLength),
        storyGenerationDurationsMs: stories.map((story) => story.durationMs),
        persistedStoryCount,
        inventorySummary,
        visibleNpcCount: npcCount,
        relationshipValues,
        strongestRelationship: strongest,
        weakestRelationship: weakest,
        generationRetryMetrics,
        contextTokenCostMetrics,
        continuityFindings,
      };

      await writeMarkdown(
        config,
        "15-statistics.md",
        `# Long-Horizon Statistics\n\n- Child age: ${config.childAge}\n- Character id: ${characterId}\n- World identity: ${evidence.statistics.worldIdentity}\n- World status: ${worldStatus}\n- Current region: ${currentRegion}\n- Current location: ${currentLocation}\n- Home location: ${homeLocation}\n- Total stories: ${stories.length}\n- World-event stories: ${sourceDistribution.world_event}\n- NPC-call stories: ${sourceDistribution.npc_call}\n- Inventory-item stories: ${sourceDistribution.inventory_item}\n- Rumor stories: ${sourceDistribution.rumor}\n- Persisted completed stories: ${persistedStoryCount}/${stories.length}\n- Total rendered story characters: ${totalNarrativeCharacters}\n- Story lengths: ${stories.map((story) => story.narrativeLength).join(", ")}\n- Story generation/start durations (ms): ${stories.map((story) => story.durationMs).join(", ")}\n- Final inventory summary: ${inventorySummary}\n- Visible NPC count: ${npcCount}\n- Relationship values: ${relationshipValues.length > 0 ? relationshipValues.join(", ") : "none visible"}\n- Strongest relationship: ${strongest ?? "not visible"}\n- Weakest relationship: ${weakest ?? "not visible"}\n- Failed/retried generations: ${generationRetryMetrics}\n- Context/token/cost metrics: ${contextTokenCostMetrics}\n- Persistent live data cleanup: disabled\n- Journey transport: visible browser UI only\n\n## Continuity findings\n\n${continuityFindings.map((finding) => `- ${finding}`).join("\n")}`,
      );'''
text = text[:stats_start] + stats_replacement + text[stats_end:]

spec.write_text(text)
