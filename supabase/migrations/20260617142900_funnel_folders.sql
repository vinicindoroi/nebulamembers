-- Create funnel_folders table
CREATE TABLE public.funnel_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.funnel_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for funnel_folders
CREATE POLICY "Users can view their own folders"
  ON public.funnel_folders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create folders"
  ON public.funnel_folders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON public.funnel_folders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON public.funnel_folders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Add folder_id to funnels table
ALTER TABLE public.funnels
ADD COLUMN folder_id UUID REFERENCES public.funnel_folders(id) ON DELETE SET NULL;

-- Create trigger for updated_at on funnel_folders
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.funnel_folders
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
