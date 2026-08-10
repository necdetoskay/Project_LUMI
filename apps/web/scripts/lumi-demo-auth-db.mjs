import { hash } from "@node-rs/argon2";
import pg from "pg";

import { LUMI_DEMO_MANIFEST } from "../../../scripts/demo/lumi-demo-manifest.mjs";

export const LUMI_DEMO_PARENT = Object.freeze({
  id: "51000000-0000-4000-8000-000000000009",
  email: "demo@lumi.local",
  displayName: "LUMI Demo Ebeveyni",
});

async function createPasswordHash(password) {
  return hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });
}

function requireDemoPassword(password) {
  if (typeof password !== "string" || password.length < 10) {
    throw new Error("LUMI_DEMO_PARENT_PASSWORD_REQUIRED");
  }
  return password;
}

export function createLumiDemoAuthPostgresAdapter(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });

  return {
    async inspect(manifest = LUMI_DEMO_MANIFEST) {
      const result = await pool.query(
        `SELECT
           EXISTS(
             SELECT 1 FROM parent_accounts
              WHERE id = $1 AND email = $2
           ) AS parent_exists,
           EXISTS(
             SELECT 1 FROM profile.household_members
              WHERE household_id = $3
                AND user_id = $1
                AND membership_role = 'owner'
                AND is_active = TRUE
           ) AS owner_membership_exists`,
        [LUMI_DEMO_PARENT.id, LUMI_DEMO_PARENT.email, manifest.household.id],
      );
      const row = result.rows[0] ?? {};
      return {
        ready: Boolean(row.parent_exists && row.owner_membership_exists),
        parentId: LUMI_DEMO_PARENT.id,
        email: LUMI_DEMO_PARENT.email,
        parentExists: Boolean(row.parent_exists),
        ownerMembershipExists: Boolean(row.owner_membership_exists),
      };
    },

    async ensure({
      manifest = LUMI_DEMO_MANIFEST,
      password = process.env.LUMI_DEMO_PARENT_PASSWORD,
    } = {}) {
      const safePassword = requireDemoPassword(password);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query(
          `SELECT id::text, email
             FROM parent_accounts
            WHERE id = $1 OR email = $2
            ORDER BY id`,
          [LUMI_DEMO_PARENT.id, LUMI_DEMO_PARENT.email],
        );
        if (existing.rowCount > 1) throw new Error("DEMO_PARENT_SCOPE_COLLISION");
        const row = existing.rows[0];
        if (
          row &&
          (row.id !== LUMI_DEMO_PARENT.id || row.email !== LUMI_DEMO_PARENT.email)
        ) {
          throw new Error("DEMO_PARENT_SCOPE_COLLISION");
        }

        if (!row) {
          const passwordHash = await createPasswordHash(safePassword);
          await client.query(
            `INSERT INTO parent_accounts (id, email, password_hash, display_name)
             VALUES ($1,$2,$3,$4)`,
            [
              LUMI_DEMO_PARENT.id,
              LUMI_DEMO_PARENT.email,
              passwordHash,
              LUMI_DEMO_PARENT.displayName,
            ],
          );
        }

        await client.query(
          `INSERT INTO profile.household_members
            (household_id, user_id, membership_role, is_active)
           VALUES ($1,$2,'owner',TRUE)
           ON CONFLICT (household_id, user_id)
           DO UPDATE SET membership_role = 'owner', is_active = TRUE`,
          [manifest.household.id, LUMI_DEMO_PARENT.id],
        );
        await client.query("COMMIT");
        return this.inspect(manifest);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async reset(manifest = LUMI_DEMO_MANIFEST) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM profile.household_members
            WHERE household_id = $1 AND user_id = $2`,
          [manifest.household.id, LUMI_DEMO_PARENT.id],
        );
        const result = await client.query(
          `DELETE FROM parent_accounts
            WHERE id = $1 AND email = $2`,
          [LUMI_DEMO_PARENT.id, LUMI_DEMO_PARENT.email],
        );
        await client.query("COMMIT");
        return { deletedParents: result.rowCount ?? 0 };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async close() {
      await pool.end();
    },
  };
}
