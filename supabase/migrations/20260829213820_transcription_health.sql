-- Visibilidade de falhas de transcricao.
--
-- Motivo: as falhas anteriores ao upload (audio que nao decodifica, otimizado
-- acima do limite, upload recusado) eram lancadas no cliente ANTES do insert,
-- entao nao deixavam rastro nenhum — o banco mostrava 100% de sucesso enquanto
-- o usuario via erro na tela. A linha passa a nascer antes da otimizacao, e
-- por isso file_path so e conhecido depois.
ALTER TABLE public.transcriptions ALTER COLUMN file_path DROP NOT NULL;

-- Sustenta as consultas por status do painel (falhas recentes e travadas).
CREATE INDEX IF NOT EXISTS transcriptions_status_created_idx
  ON public.transcriptions (status, created_at DESC);

-- Metricas de saude + lista de problemas recentes, agregadas no banco.
CREATE OR REPLACE FUNCTION public.admin_transcription_health(
  stuck_after_minutes INT DEFAULT 10,
  problem_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH problemas AS (
    SELECT
      t.id,
      t.title,
      t.status,
      t.error,
      t.created_at,
      p.email
    FROM public.transcriptions t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    WHERE t.status = 'error'
       OR (
         t.status IN ('pending', 'processing')
         AND t.created_at < now() - (stuck_after_minutes * INTERVAL '1 minute')
       )
    ORDER BY t.created_at DESC
    LIMIT problem_limit
  )
  SELECT jsonb_build_object(
    'failures_7d', (
      SELECT count(*) FROM public.transcriptions
      WHERE status = 'error' AND created_at >= now() - INTERVAL '7 days'
    ),
    'stuck', (
      SELECT count(*) FROM public.transcriptions
      WHERE status IN ('pending', 'processing')
        AND created_at < now() - (stuck_after_minutes * INTERVAL '1 minute')
    ),
    'total_30d', (
      SELECT count(*) FROM public.transcriptions
      WHERE created_at >= now() - INTERVAL '30 days'
    ),
    'done_30d', (
      SELECT count(*) FROM public.transcriptions
      WHERE status = 'done' AND created_at >= now() - INTERVAL '30 days'
    ),
    'minutes_30d', (
      SELECT round(coalesce(sum(duration), 0) / 60.0, 1) FROM public.transcriptions
      WHERE status = 'done' AND created_at >= now() - INTERVAL '30 days'
    ),
    'problems', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(problemas.*) ORDER BY problemas.created_at DESC),
        '[]'::jsonb
      )
      FROM problemas
    )
  );
$$;

-- Mesmo padrao de admin_user_stats: so o service_role executa.
REVOKE ALL ON FUNCTION public.admin_transcription_health(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_transcription_health(INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transcription_health(INT, INT) TO service_role;
