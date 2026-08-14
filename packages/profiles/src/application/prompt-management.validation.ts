export interface PromptDraftValidationInput {
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: string[];
  requiredVariables: string[];
}

export function validatePromptDraft(input: PromptDraftValidationInput) {
  if (!input.systemTemplate.trim())
    throw new Error("PROMPT_SYSTEM_TEMPLATE_REQUIRED");
  if (!input.userTemplate.trim())
    throw new Error("PROMPT_USER_TEMPLATE_REQUIRED");
  const allowed = new Set(input.allowedVariables);
  for (const key of input.requiredVariables) {
    if (!allowed.has(key))
      throw new Error(`PROMPT_REQUIRED_VARIABLE_NOT_ALLOWED:${key}`);
  }
  const templates = `${input.systemTemplate}\n${input.userTemplate}`;
  for (const match of templates.matchAll(/{{\s*([A-Za-z0-9_.-]+)\s*}}/g)) {
    const key = match[1];
    if (key && !allowed.has(key))
      throw new Error(`PROMPT_VARIABLE_NOT_ALLOWED:${key}`);
  }
}
