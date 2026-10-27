-- Separate mentor materials from the existing checkout offers.
CREATE TABLE public.member_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT false,
  access_levels text[] NOT NULL CHECK (cardinality(access_levels) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.member_offer_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.member_offers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) > 0),
  storage_path text NOT NULL UNIQUE,
  size bigint NOT NULL CHECK (size > 0 AND size <= 52428800),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (split_part(storage_path, '/', 1) = offer_id::text)
);
CREATE INDEX member_offer_files_offer_id_idx ON public.member_offer_files(offer_id);
ALTER TABLE public.member_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_offer_files ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_offers, public.member_offer_files TO authenticated;
GRANT ALL ON public.member_offers, public.member_offer_files TO service_role;

-- This internal lookup needs to bypass the offers policy to avoid RLS recursion.
-- Reuse the same canonical plan resolver as courses, including custom plan names.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE FUNCTION private.can_access_member_offer(_offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.member_offers o
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE o.id = _offer_id AND o.active
        AND public.plan_slug(p.plan) NOT IN ('', 'pending', 'pendente')
        AND EXISTS (
          SELECT 1 FROM unnest(o.access_levels) AS allowed(plan)
          WHERE public.plan_slug(allowed.plan) = public.plan_slug(p.plan)
        )
    )
  );
$$;
REVOKE ALL ON FUNCTION private.can_access_member_offer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_access_member_offer(uuid) TO authenticated;

CREATE POLICY "member offers read by plan" ON public.member_offers
FOR SELECT TO authenticated USING (private.can_access_member_offer(id));
CREATE POLICY "member offers admin write" ON public.member_offers
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "member offer files read by plan" ON public.member_offer_files
FOR SELECT TO authenticated USING (private.can_access_member_offer(offer_id));
CREATE POLICY "member offer files admin write" ON public.member_offer_files
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('member-offers', 'member-offers', false, 52428800);
CREATE POLICY "member offer storage admin write" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'member-offers' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'member-offers' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "member offer storage read by plan" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'member-offers' AND EXISTS (
    SELECT 1 FROM public.member_offer_files f
    WHERE f.storage_path = storage.objects.name
      AND private.can_access_member_offer(f.offer_id)
  )
);
