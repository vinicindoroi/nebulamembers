-- Adiciona a coluna cover_url à tabela public.modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS cover_url TEXT;
