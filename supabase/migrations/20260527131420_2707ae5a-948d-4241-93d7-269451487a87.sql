
CREATE TABLE public.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  file_path TEXT NOT NULL,
  file_name TEXT,
  language TEXT NOT NULL DEFAULT 'pt',
  mode TEXT NOT NULL DEFAULT 'dolphin',
  diarize BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  text TEXT,
  segments JSONB,
  speakers JSONB,
  duration NUMERIC,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcriptions TO authenticated;
GRANT ALL ON public.transcriptions TO service_role;

ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transcriptions" ON public.transcriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transcriptions" ON public.transcriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own transcriptions" ON public.transcriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own transcriptions" ON public.transcriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX transcriptions_user_created_idx ON public.transcriptions(user_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER transcriptions_set_updated_at
  BEFORE UPDATE ON public.transcriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcriptions;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);
