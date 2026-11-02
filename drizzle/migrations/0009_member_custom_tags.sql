CREATE TABLE public.member_tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 60),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX member_tags_name_unique ON public.member_tags (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_tags TO authenticated;
GRANT ALL ON public.member_tags TO service_role;
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins manage member tags" ON public.member_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.member_tag_assignments (
 member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 tag_id uuid NOT NULL REFERENCES public.member_tags(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (member_id, tag_id)
);
CREATE INDEX member_tag_assignments_tag_idx ON public.member_tag_assignments(tag_id);
GRANT SELECT, INSERT, DELETE ON public.member_tag_assignments TO authenticated;
GRANT ALL ON public.member_tag_assignments TO service_role;
ALTER TABLE public.member_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins read member assignments" ON public.member_tag_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins add member assignments" ON public.member_tag_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins remove member assignments" ON public.member_tag_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));