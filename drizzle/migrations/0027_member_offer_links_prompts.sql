ALTER TABLE public.member_offers
  ADD COLUMN links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN prompts jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.member_offers
  SET links = jsonb_build_array(jsonb_build_object('label', '', 'url', link_url))
  WHERE link_url IS NOT NULL;
ALTER TABLE public.member_offers
  ADD CONSTRAINT member_offers_links_array CHECK (jsonb_typeof(links) = 'array' AND jsonb_array_length(links) <= 50),
  ADD CONSTRAINT member_offers_prompts_array CHECK (jsonb_typeof(prompts) = 'array' AND jsonb_array_length(prompts) <= 50);
COMMENT ON COLUMN public.member_offers.link_url IS 'DEPRECATED: replaced by links';