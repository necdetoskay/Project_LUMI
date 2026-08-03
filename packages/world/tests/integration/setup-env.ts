const ENABLE_DESTRUCTIVE = process.env.WORLD_TEST_ENABLE_DESTRUCTIVE === "true";
const DATABASE_URL = process.env.WORLD_TEST_DATABASE_URL;

if (ENABLE_DESTRUCTIVE) {
  if (!DATABASE_URL) {
    throw new Error(
      "[WORLD-DESTRUCTIVE-TEST] WORLD_TEST_DATABASE_URL must be set when WORLD_TEST_ENABLE_DESTRUCTIVE=true",
    );
  }

  const u = new URL(DATABASE_URL);
  const dbName = u.pathname.replace(/^\//, "").split("?")[0]!;
  if (!dbName || (!dbName.includes("test") && !dbName.includes("review"))) {
    throw new Error(
      `[WORLD-DESTRUCTIVE-TEST] UNSAFE DB NAME: "${dbName}". ` +
      `Destructive tests require DB name containing "test" or "review".`,
    );
  }
}
