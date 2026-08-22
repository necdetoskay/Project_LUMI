-- PR-2 / Data Integrity Hardening
--
-- A child profile UUID is only valid inside its canonical household. Tables that
-- redundantly persist both child_profile_id and household_id must not be able to
-- pair a child from household A with household B.
--
-- The profile migration runner executes each migration in a transaction. This
-- migration therefore fails closed before any composite foreign key is committed
-- if historical scope drift is detected.

CREATE UNIQUE INDEX IF NOT EXISTS child_profiles_id_household_unique
  ON profile.child_profiles (id, household_id);

DO $$
DECLARE
  scoped_table RECORD;
  violation_count BIGINT;
  scope_constraint_name TEXT;
BEGIN
  FOR scoped_table IN
    SELECT c.table_name
    FROM information_schema.columns AS c
    INNER JOIN information_schema.tables AS t
      ON t.table_schema = c.table_schema
      AND t.table_name = c.table_name
    WHERE c.table_schema = 'profile'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('child_profile_id', 'household_id')
      AND c.table_name <> 'child_profiles'
    GROUP BY c.table_name
    HAVING COUNT(DISTINCT c.column_name) = 2
    ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM profile.%I AS scoped ' ||
      'LEFT JOIN profile.child_profiles AS child ON child.id = scoped.child_profile_id ' ||
      'WHERE scoped.child_profile_id IS NOT NULL ' ||
      'AND (child.id IS NULL OR child.household_id IS DISTINCT FROM scoped.household_id)',
      scoped_table.table_name
    ) INTO violation_count;

    IF violation_count > 0 THEN
      RAISE EXCEPTION
        'Household scope mismatch detected in profile.%: % invalid row(s)',
        scoped_table.table_name,
        violation_count;
    END IF;

    scope_constraint_name := format(
      'scope_%s_%s_fk',
      left(scoped_table.table_name, 32),
      left(md5(scoped_table.table_name), 8)
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = format('profile.%I', scoped_table.table_name)::regclass
        AND conname = scope_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE profile.%I ADD CONSTRAINT %I ' ||
        'FOREIGN KEY (child_profile_id, household_id) ' ||
        'REFERENCES profile.child_profiles (id, household_id) NOT VALID',
        scoped_table.table_name,
        scope_constraint_name
      );

      EXECUTE format(
        'ALTER TABLE profile.%I VALIDATE CONSTRAINT %I',
        scoped_table.table_name,
        scope_constraint_name
      );
    END IF;
  END LOOP;
END
$$;
