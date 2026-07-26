import { and, eq } from "drizzle-orm";
import type { QueryExecutor } from "../../db/transaction";
import {
  householdMembers,
  childProfiles,
  universes,
  worlds,
} from "../../db/schema";
import {
  AuthorizationError,
  type AuthContext,
} from "./auth-context";

export function requireRole(
  context: AuthContext,
  allowedRoles: string[],
): void {
  const allowed = context.user.roles.some((role) =>
    allowedRoles.includes(role),
  );

  if (!allowed) {
    throw new AuthorizationError();
  }
}

export async function requireHouseholdAccess(
  tx: QueryExecutor,
  context: AuthContext,
  householdId: string,
): Promise<void> {
  if (context.user.roles.includes("admin")) return;

  const [membership] = await tx
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.householdId, householdId),
      eq(householdMembers.userId, context.user.id),
    ))
    .limit(1);

  if (!membership) {
    throw new AuthorizationError();
  }
}

export async function requireChildAccess(
  tx: QueryExecutor,
  context: AuthContext,
  childProfileId: string,
): Promise<void> {
  const [child] = await tx
    .select({ householdId: childProfiles.householdId })
    .from(childProfiles)
    .where(eq(childProfiles.id, childProfileId))
    .limit(1);

  if (!child) {
    throw new AuthorizationError();
  }

  await requireHouseholdAccess(
    tx,
    context,
    child.householdId,
  );
}

export async function requireWorldAccess(
  tx: QueryExecutor,
  context: AuthContext,
  worldId: string,
): Promise<void> {
  const [world] = await tx
    .select({ householdId: universes.householdId })
    .from(worlds)
    .innerJoin(
      universes,
      eq(worlds.universeId, universes.id),
    )
    .where(eq(worlds.id, worldId))
    .limit(1);

  if (!world) {
    throw new AuthorizationError();
  }

  await requireHouseholdAccess(
    tx,
    context,
    world.householdId,
  );
}
