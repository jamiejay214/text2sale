-- Allow lead-magnet downloads and newsletter signups to be captured through
-- the existing prospect pipeline (rate limit, consent text, source tagging).
alter table public.text2sale_prospects drop constraint if exists text2sale_prospects_kind_check;
alter table public.text2sale_prospects add constraint text2sale_prospects_kind_check
  check (kind = any (array['signup'::text, 'inquiry'::text, 'resource'::text, 'newsletter'::text]));
