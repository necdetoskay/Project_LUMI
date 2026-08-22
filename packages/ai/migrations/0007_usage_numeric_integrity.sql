-- PR-8 / Data Integrity Hardening

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_generation_usage_numeric_check') THEN
    ALTER TABLE ai.generation_usage
      ADD CONSTRAINT ai_generation_usage_numeric_check CHECK (
        input_tokens >= 0
        AND output_tokens >= 0
        AND total_tokens >= 0
        AND total_tokens = input_tokens + output_tokens
        AND latency_ms >= 0
        AND attempt >= 1
        AND cost_usd >= 0
        AND completed_at >= started_at
      ) NOT VALID;
    ALTER TABLE ai.generation_usage VALIDATE CONSTRAINT ai_generation_usage_numeric_check;
  END IF;
END
$$;
