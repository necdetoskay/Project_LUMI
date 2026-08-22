-- PR-8 / Data Integrity Hardening

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'privacy_consent_child_scope_fk') THEN
    ALTER TABLE privacy.consent_records
      ADD CONSTRAINT privacy_consent_child_scope_fk
      FOREIGN KEY (child_profile_id, household_id)
      REFERENCES profile.child_profiles (id, household_id) NOT VALID;
    ALTER TABLE privacy.consent_records VALIDATE CONSTRAINT privacy_consent_child_scope_fk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'privacy_export_child_scope_fk') THEN
    ALTER TABLE privacy.data_export_records
      ADD CONSTRAINT privacy_export_child_scope_fk
      FOREIGN KEY (child_profile_id, household_id)
      REFERENCES profile.child_profiles (id, household_id) NOT VALID;
    ALTER TABLE privacy.data_export_records VALIDATE CONSTRAINT privacy_export_child_scope_fk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'privacy_consent_status_time_check') THEN
    ALTER TABLE privacy.consent_records
      ADD CONSTRAINT privacy_consent_status_time_check CHECK (
        (status = 'granted' AND revoked_at IS NULL)
        OR (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_at >= granted_at)
      ) NOT VALID;
    ALTER TABLE privacy.consent_records VALIDATE CONSTRAINT privacy_consent_status_time_check;
  END IF;
END
$$;
