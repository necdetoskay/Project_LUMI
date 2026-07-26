import type { ZodType } from "zod";

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}
