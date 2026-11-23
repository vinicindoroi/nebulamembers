CREATE TABLE public.student_stripe_connections (
  user_id uuid PRIMARY KEY,
  key_ciphertext text NOT NULL,
  key_last4 text NOT NULL,
  account_name text,
  livemode boolean NOT NULL DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.student_stripe_connections TO service_role;
REVOKE ALL ON public.student_stripe_connections FROM anon, authenticated;
ALTER TABLE public.student_stripe_connections ENABLE ROW LEVEL SECURITY;