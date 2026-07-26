import { seedPermissions } from "./permissions.seed";
import { seedRoles } from "./roles.seed";

export async function seedIdentityReferenceData(): Promise<void> {
  await seedRoles();
  await seedPermissions();
}
