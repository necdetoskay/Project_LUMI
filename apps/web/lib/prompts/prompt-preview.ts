export type PromptPreviewInput = {
  systemTemplate: string;
  userTemplate: string;
  allowedVariables: string[];
  requiredVariables: string[];
};

export type PromptPreviewResult = {
  system: string;
  user: string;
  usedVariables: string[];
  missingRequiredVariables: string[];
  unknownTemplateVariables: string[];
};

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function templateVariables(template: string) {
  return [...template.matchAll(VARIABLE_PATTERN)].map(
    (match) => match[1] ?? "",
  );
}

function valueForPath(context: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current))
      return undefined;
    return (current as Record<string, unknown>)[part];
  }, context);
}

function printable(value: unknown) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function render(template: string, context: Record<string, unknown>) {
  return template.replace(VARIABLE_PATTERN, (_, variable: string) =>
    printable(valueForPath(context, variable)),
  );
}

export function previewPrompt(
  input: PromptPreviewInput,
  context: Record<string, unknown>,
): PromptPreviewResult {
  const variables = [
    ...new Set([
      ...templateVariables(input.systemTemplate),
      ...templateVariables(input.userTemplate),
    ]),
  ];
  const allowed = new Set(input.allowedVariables);
  return {
    system: render(input.systemTemplate, context),
    user: render(input.userTemplate, context),
    usedVariables: variables,
    missingRequiredVariables: input.requiredVariables.filter(
      (variable) => valueForPath(context, variable) === undefined,
    ),
    unknownTemplateVariables: variables.filter(
      (variable) => !allowed.has(variable),
    ),
  };
}
