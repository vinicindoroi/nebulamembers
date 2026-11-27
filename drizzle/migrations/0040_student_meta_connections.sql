CREATE TABLE public.student_meta_connections (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 token_ciphertext text NOT NULL,
 facebook_name text NOT NULL,
 expires_at timestamptz NOT NULL,
 connected_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.student_meta_connections TO service_role;
REVOKE ALL ON public.student_meta_connections FROM anon, authenticated;
ALTER TABLE public.student_meta_connections ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.student_meta_oauth_states (
 state_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 redirect_uri text NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.student_meta_oauth_states TO service_role;
REVOKE ALL ON public.student_meta_oauth_states FROM anon, authenticated;
ALTER TABLE public.student_meta_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE INDEX student_meta_oauth_user_idx ON public.student_meta_oauth_states(user_id);
CREATE TABLE public.student_meta_reports (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 cache_key text NOT NULL,
 report jsonb NOT NULL,
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(user_id, cache_key)
);
GRANT ALL ON public.student_meta_reports TO service_role;
REVOKE ALL ON public.student_meta_reports FROM anon, authenticated;
ALTER TABLE public.student_meta_reports ENABLE ROW LEVEL SECURITY;