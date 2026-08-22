export function verifyLedgerAgainstRepository(appliedRows, migrations) {
  const repoByFile = new Map(migrations.map((migration) => [migration.file, migration]));

  for (const row of appliedRows) {
    const migration = repoByFile.get(row.migration_file);

    if (!migration) {
      throw new Error(
        `Applied profile migration ${row.migration_file} is missing from the repository. ` +
          "Refusing to continue because migration history was rewritten or deleted.",
      );
    }

    if (migration.sequence !== row.sequence_id) {
      throw new Error(
        `Sequence drift detected for ${row.migration_file}: ` +
          `database=${row.sequence_id}, repository=${migration.sequence}`,
      );
    }

    if (migration.checksum !== row.checksum_sha256) {
      throw new Error(
        `Checksum drift detected for applied migration ${row.migration_file}. ` +
          "Applied migrations are immutable; create a new migration instead of editing history.",
      );
    }
  }
}
