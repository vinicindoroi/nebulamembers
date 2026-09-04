-- 1) Perfis: restringe leitura a dono do perfil + admin
DROP POLICY IF EXISTS "profiles read auth" ON public.profiles;
CREATE POLICY "profiles read own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Visão pública com colunas seguras para comunidade/fórum/menções
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, bio, xp, instagram, last_seen_at, status
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2) Notificações: só avisos gerais ou destinados ao próprio usuário
DROP POLICY IF EXISTS "notif read auth" ON public.notifications;
CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id IS NULL OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3) Função de verificação de acesso por nível (free < pro < premium)
CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE l.id = _lesson_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR l.is_free
        OR l.access_level = 'free'
        OR (l.access_level = 'pro' AND lower(COALESCE(p.plan, '')) IN ('pro', 'premium'))
        OR (l.access_level = 'premium' AND lower(COALESCE(p.plan, '')) = 'premium')
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_lesson(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated, service_role;

-- 4) Storage: vídeos e anexos respeitam o nível de acesso da aula
DROP POLICY IF EXISTS "lesson videos read auth" ON storage.objects;
CREATE POLICY "lesson videos read by access" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-videos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        WHERE l.video_path = storage.objects.name
           OR l.poster_url = storage.objects.name
      ) = false
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        WHERE (l.video_path = storage.objects.name OR l.poster_url = storage.objects.name)
          AND public.can_access_lesson(l.id)
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can download attachments" ON storage.objects;
CREATE POLICY "attachments read by access" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.lesson_attachments la
        WHERE la.file_path = storage.objects.name
          AND public.can_access_lesson(la.lesson_id)
      )
    )
  );