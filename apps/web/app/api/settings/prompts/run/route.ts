import { NextResponse } from "next/server";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { validateJsonSchema } from "@/lib/prompts/json-schema-validation";
import { previewPrompt } from "@/lib/prompts/prompt-preview";
import {
  generateTextWithLlm,
  getOwnedHousehold,
  listPromptVersions,
  recordAiGenerationTrace,
} from "@lumi/profiles/application";

export async function POST(request: Request) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const household = await getOwnedHousehold(parent.id);
  if (!household)
    return NextResponse.json(
      { message: "Owned household not found" },
      { status: 404 },
    );

  const body = (await request.json()) as {
    promptKey?: string;
    version?: number;
    context?: Record<string, unknown>;
  };
  if (
    !body.promptKey ||
    !Number.isInteger(body.version) ||
    !body.context ||
    typeof body.context !== "object" ||
    Array.isArray(body.context)
  )
    return NextResponse.json(
      { message: "Invalid run request" },
      { status: 400 },
    );

  const versions = await listPromptVersions(body.promptKey);
  const target = versions.find((item) => item.version === body.version);
  if (!target)
    return NextResponse.json(
      { message: "Prompt version not found" },
      { status: 404 },
    );

  const preview = previewPrompt(
    {
      systemTemplate: target.systemTemplate,
      userTemplate: target.userTemplate,
      allowedVariables: target.allowedVariables,
      requiredVariables: target.requiredVariables,
    },
    body.context,
  );
  if (
    preview.missingRequiredVariables.length ||
    preview.unknownTemplateVariables.length
  )
    return NextResponse.json(
      {
        message: "Prompt validation failed",
        validation: {
          missingRequiredVariables: preview.missingRequiredVariables,
          unknownTemplateVariables: preview.unknownTemplateVariables,
        },
      },
      { status: 422 },
    );
  if (!target.modelOverride?.trim())
    return NextResponse.json(
      { message: "Bu prompt sürümü için model seçilmemiş." },
      { status: 422 },
    );

  try {
    const generated = await generateTextWithLlm({
      userId: parent.id,
      householdId: household.id,
      taskType: body.promptKey,
      system: preview.system,
      user: preview.user,
      modelOverride: target.modelOverride,
      generationConfig: target.generationConfig,
    });
    let parsedJson: unknown | null = null;
    try {
      parsedJson = JSON.parse(generated.content) as unknown;
    } catch {
      parsedJson = null;
    }
    const schemaValidation =
      parsedJson === null
        ? { valid: false, errors: ["$: output is not valid JSON"] }
        : validateJsonSchema(parsedJson, target.outputSchema);
    const outputPayload =
      parsedJson && typeof parsedJson === "object" && !Array.isArray(parsedJson)
        ? (parsedJson as Record<string, unknown>)
        : { rawOutput: generated.content };

    await recordAiGenerationTrace({
      householdId: household.id,
      taskType: `prompt_playground:${body.promptKey}`,
      promptKey: body.promptKey,
      promptVersion: target.version,
      inputContext: body.context,
      outputPayload,
      validationStatus: schemaValidation.valid ? "valid" : "invalid",
      generated,
    });

    return NextResponse.json({
      data: {
        version: target.version,
        status: target.status,
        output: generated.content,
        parsedJson,
        provider: generated.provider,
        model: generated.model,
        usage: {
          inputTokens: generated.promptTokens,
          outputTokens: generated.completionTokens,
          totalTokens: generated.totalTokens,
        },
        latencyMs: generated.latencyMs,
        estimatedCostUsd:
          generated.cost === null
            ? null
            : generated.cost.estimatedCostUsdMicros / 1_000_000,
        schemaValidation,
      },
    });
  } catch (cause) {
    return NextResponse.json(
      {
        message:
          cause instanceof Error ? cause.message : "Model execution failed",
      },
      { status: 502 },
    );
  }
}
