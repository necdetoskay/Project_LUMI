import { NextResponse } from "next/server";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { generateText } from "@/lib/ai/text-generation/gateway";
import { validateJsonSchema } from "@/lib/prompts/json-schema-validation";
import { previewPrompt } from "@/lib/prompts/prompt-preview";
import { listPromptVersions } from "@lumi/profiles/application";

export async function POST(request: Request) {
  const parent = await getParentFromSessionToken(
    await getParentSessionCookie(),
  );
  if (!parent)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
    const result = await generateText({
      purpose: body.promptKey,
      system: preview.system,
      user: preview.user,
      provider: target.providerOverride || "openrouter",
      model: target.modelOverride,
      generationConfig: target.generationConfig,
      outputSchema: target.outputSchema,
    });
    const schemaValidation =
      result.parsedJson === null
        ? { valid: false, errors: ["$: output is not valid JSON"] }
        : validateJsonSchema(result.parsedJson, target.outputSchema);
    return NextResponse.json({
      data: {
        version: target.version,
        status: target.status,
        ...result,
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
