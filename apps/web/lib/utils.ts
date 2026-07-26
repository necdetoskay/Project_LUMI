export function joinClassNames(
  ...classNames: Array<false | null | string | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}
