# Supabase setup

Este projeto foi gerado inicialmente com um Supabase controlado pela Lovable. Para trabalhar com controle total, crie um projeto Supabase seu e aponte o app para ele.

## 1. Criar o projeto

1. Crie um novo projeto em Supabase.
2. Copie:
   - Project ref
   - Project URL
   - anon/publishable key
   - service role key

## 2. Configurar o ambiente local

Copie `.env.example` para `.env` e preencha com os dados do seu projeto.

Campos usados pelo frontend:

```txt
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Campos usados em rotas/server helpers:

```txt
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## 3. Aplicar banco, storage e policies

Instale o Supabase CLI, faça login e vincule o projeto:

```powershell
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

As migrations criam:

- tabela `public.transcriptions`
- RLS para cada usuario acessar apenas seus dados
- bucket privado `audio-files`
- policies de upload/leitura/remocao por usuario
- realtime para `transcriptions`

## 4. Configurar Google Auth

No Supabase:

1. Va em `Authentication > Providers > Google`.
2. Ative o provider.
3. Configure Client ID e Client Secret do Google.
4. Em `Authentication > URL Configuration`, adicione:

```txt
http://127.0.0.1:8080
http://localhost:8080
```

No Google Cloud OAuth, adicione o callback:

```txt
https://your-project-ref.supabase.co/auth/v1/callback
```

## 5. Configurar secrets da Edge Function

A funcao `transcribe` precisa destes secrets:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY
```

Configure com:

```powershell
supabase secrets set SUPABASE_URL="https://your-project-ref.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your-anon-key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
supabase secrets set LOVABLE_API_KEY="your-lovable-ai-gateway-key"
```

Depois publique a funcao:

```powershell
supabase functions deploy transcribe
```

## 6. Rodar localmente

```powershell
bun install
bun run dev
```

Abra:

```txt
http://127.0.0.1:8080
```

## Observacao sobre transcricao

A funcao atual usa o endpoint `https://ai.gateway.lovable.dev`. Se voce nao tiver uma `LOVABLE_API_KEY`, a autenticacao, storage e historico funcionarao no seu Supabase, mas a transcricao ainda vai falhar. Nesse caso, o proximo passo e trocar o provider de IA da funcao `transcribe` para uma API sob seu controle.
