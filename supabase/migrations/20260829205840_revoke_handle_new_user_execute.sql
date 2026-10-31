-- handle_new_user() e uma funcao de trigger SECURITY DEFINER, mas estava com
-- EXECUTE aberto para anon/authenticated, ficando exposta em
-- /rest/v1/rpc/handle_new_user. Nao ha caso de uso para chamada direta.
--
-- Isso nao afeta o cadastro: o privilegio EXECUTE de uma funcao de trigger e
-- checado na criacao do trigger, nao a cada disparo, e o INSERT em auth.users
-- roda como supabase_auth_admin, nunca como anon.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
