import { createDatabase, type Database } from "../db/client";

let db: Database | undefined;

function getConnectionString(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://lumi:lumi_local_only@localhost:15432/lumi"
  );
}

export function getProfileDb(): Database {
  db ??= createDatabase(getConnectionString());
  return db;
}
