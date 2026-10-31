-- Agrega as estatisticas por usuario direto no banco.
-- Antes o servidor baixava a tabela inteira de transcricoes para contar em JS,
-- o que trafega dados a toa e trunca as contagens ao bater o teto de linhas
-- por resposta do PostgREST.
CREATE OR REPLACE FUNCTION public.admin_user_stats()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  transcription_count BIGINT,
  last_transcription TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    COALESCE(t.total, 0) AS transcription_count,
    t.last_at AS last_transcription
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS total, MAX(created_at) AS last_at
    FROM public.transcriptions
    GROUP BY user_id
  ) t ON t.user_id = p.id
  ORDER BY p.created_at DESC;
$$;

-- SECURITY INVOKER (padrao): quem chama e o service_role, que ja ignora RLS.
-- Nenhum papel de usuario final pode executar.
REVOKE ALL ON FUNCTION public.admin_user_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_user_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_stats() TO service_role;

-- O GROUP BY / MAX ja e sustentado pelo indice transcriptions_user_created_idx
-- (user_id, created_at DESC), criado na migration inicial.
