ALTER TABLE public.member_offers ADD COLUMN link_url text;
ALTER TABLE public.member_offers ADD CONSTRAINT member_offers_link_url_check
  CHECK (link_url IS NULL OR (link_url ~* '^https?://' AND length(link_url) <= 2000));