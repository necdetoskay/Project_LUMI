import { seedIdentityReferenceData as seedIdentity } from "./seed-identity-reference-data";

export async function seedIdentityReferenceData(): Promise<void> {
  await seedIdentity();
}
