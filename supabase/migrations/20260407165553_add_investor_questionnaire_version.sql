BEGIN;

ALTER TABLE public.investor_profile_assessments
ADD COLUMN IF NOT EXISTS questionnaire_version INTEGER;

UPDATE public.investor_profile_assessments
SET questionnaire_version = NULLIF((answers ->> 'version')::integer, 0)
WHERE questionnaire_version IS NULL
  AND jsonb_typeof(answers) = 'object'
  AND answers ? 'version'
  AND (answers ->> 'version') ~ '^\d+$';

COMMENT ON COLUMN public.investor_profile_assessments.questionnaire_version IS
  'Explicit questionnaire/scoring schema version recorded at assessment time. Preserve history; do not reinterpret silently.';

COMMIT;;
