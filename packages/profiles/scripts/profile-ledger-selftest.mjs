import assert from "node:assert/strict";
import { verifyLedgerAgainstRepository } from "./profile-ledger-contract.mjs";

const migrations = [
  {
    file: "0001_first.sql",
    sequence: "0001",
    checksum: "a".repeat(64),
  },
  {
    file: "0002_second.sql",
    sequence: "0002",
    checksum: "b".repeat(64),
  },
];

verifyLedgerAgainstRepository(
  [
    {
      migration_file: "0001_first.sql",
      sequence_id: "0001",
      checksum_sha256: "a".repeat(64),
    },
  ],
  migrations,
);

assert.throws(
  () =>
    verifyLedgerAgainstRepository(
      [
        {
          migration_file: "0001_deleted.sql",
          sequence_id: "0001",
          checksum_sha256: "a".repeat(64),
        },
      ],
      migrations,
    ),
  /missing from the repository/,
);

assert.throws(
  () =>
    verifyLedgerAgainstRepository(
      [
        {
          migration_file: "0001_first.sql",
          sequence_id: "9999",
          checksum_sha256: "a".repeat(64),
        },
      ],
      migrations,
    ),
  /Sequence drift detected/,
);

assert.throws(
  () =>
    verifyLedgerAgainstRepository(
      [
        {
          migration_file: "0001_first.sql",
          sequence_id: "0001",
          checksum_sha256: "c".repeat(64),
        },
      ],
      migrations,
    ),
  /Checksum drift detected/,
);

console.warn("Profile migration ledger self-test OK");
