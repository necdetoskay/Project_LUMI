import { NextResponse } from "next/server";
import { getParentSessionCookie } from "@/lib/auth/http";
import { getParentFromSessionToken } from "@/lib/auth/service";
import { previewPrompt } from "@/lib/prompts/prompt-preview";
import { listPromptVersions } from "@lumi/profiles/application/prompt-management.service";

export async function POST(request: Request) {
  const parent = await getParentFromSessionToken(await getParentSessionCookie());
  if (!parent) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    promptKey?: string;
    version?: number;
    context?: Record<string, unknown>;
  };
  if (!body.promptKey || !Number.isInteger(body.version) || !body.context || typeof body.context !== "object") {
    return NextResponse.json({ message: "Invalid preview request" }, { status: 400 });
  }

  const versions = await listPromptVersions(body.promptKey);
  const target = versions.find((item) => item.version === body.version);
  if (!target) return NextResponse.json({ message: "Prompt version not found" }, { status: 404 });

  return NextResponse.json({
    data: previewPrompt(
      {
        systemTemplate: target.systemTemplate,
        userTemplate: target.userTemplate,
        allowedVariables: target.allowedVariables,
        requiredVariables: target.requiredVariables,
      },
      body.context,
    ),
  });
}
