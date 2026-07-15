CREATE INDEX IF NOT EXISTS "leads_search_idx" ON "leads" USING gin (
  to_tsvector(
    'simple',
    COALESCE("title", '') || ' ' || COALESCE("summary", '') || ' ' || COALESCE("message", '') || ' ' || COALESCE("package_code", '')
  )
);
