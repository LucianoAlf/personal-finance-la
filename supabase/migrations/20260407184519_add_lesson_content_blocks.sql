ALTER TABLE public.education_lessons ADD COLUMN IF NOT EXISTS content_blocks JSONB;

COMMENT ON COLUMN public.education_lessons.content_blocks IS 'Structured lesson body as typed ContentBlock[] array. NULL means content not yet authored.';;
