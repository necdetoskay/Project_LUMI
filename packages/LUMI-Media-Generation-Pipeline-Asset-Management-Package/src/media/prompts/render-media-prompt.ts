export type MediaPromptTemplate = {
  code: string;
  template: string;
  negativePrompt?: string;
};

export function renderMediaPrompt(
  template: MediaPromptTemplate,
  variables: Record<string, unknown>,
): {
  prompt: string;
  negativePrompt?: string;
} {
  const replace = (value: string) =>
    value.replace(
      /{{\s*([a-zA-Z0-9_.]+)\s*}}/g,
      (_, key: string) => {
        const result = key
          .split(".")
          .reduce<unknown>(
            (current, part) =>
              current &&
              typeof current === "object"
                ? (
                    current as Record<
                      string,
                      unknown
                    >
                  )[part]
                : undefined,
            variables,
          );

        return result === undefined
          ? ""
          : String(result);
      },
    );

  return {
    prompt: replace(template.template),
    negativePrompt:
      template.negativePrompt
        ? replace(template.negativePrompt)
        : undefined,
  };
}
