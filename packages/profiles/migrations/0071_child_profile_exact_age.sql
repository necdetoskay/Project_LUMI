ALTER TABLE profile.child_profiles
  ADD COLUMN IF NOT EXISTS age_years INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'child_profiles_age_years_check'
      AND conrelid = 'profile.child_profiles'::regclass
  ) THEN
    ALTER TABLE profile.child_profiles
      ADD CONSTRAINT child_profiles_age_years_check
      CHECK (age_years IS NULL OR (age_years >= 3 AND age_years <= 17));
  END IF;
END
$$;

COMMENT ON COLUMN profile.child_profiles.age_years IS
  'Exact child age in completed years when known. Existing age-band-only profiles may remain NULL.';
