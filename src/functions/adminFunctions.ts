"use server";

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  transcription_count: number;
  last_transcription: string | null;
};

export type TranscriptionProblem = {
  id: string;
  title: string;
  status: string;
  error: string | null;
  created_at: string;
  email: string | null;
};

export type TranscriptionHealth = {
  failures_7d: number;
  stuck: number;
  total_30d: number;
  done_30d: number;
  minutes_30d: number;
  problems: TranscriptionProblem[];
};

export const getTranscriptionHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TranscriptionHealth> => {
    const { data: meData } = await context.supabase.auth.getUser();
    if (!isAdminEmail(meData?.user?.email)) {
      throw new Error("Forbidden: acesso restrito ao administrador");
    }

    const { data, error } = await supabaseAdmin.rpc("admin_transcription_health");
    if (error) throw new Error(error.message);

    // A RPC devolve jsonb, entao chega como Json solto — normaliza aqui.
    const raw = (data ?? {}) as Record<string, unknown>;
    return {
      failures_7d: Number(raw.failures_7d ?? 0),
      stuck: Number(raw.stuck ?? 0),
      total_30d: Number(raw.total_30d ?? 0),
      done_30d: Number(raw.done_30d ?? 0),
      minutes_30d: Number(raw.minutes_30d ?? 0),
      problems: (raw.problems as TranscriptionProblem[]) ?? [],
    };
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: meData } = await context.supabase.auth.getUser();
    if (!isAdminEmail(meData?.user?.email)) {
      throw new Error("Forbidden: acesso restrito ao administrador");
    }

    // A contagem e o MAX saem agregados do banco — ver a migration
    // 20260829120000_admin_user_stats.sql.
    const { data, error } = await supabaseAdmin.rpc("admin_user_stats");
    if (error) throw new Error(error.message);

    // Atencao: os tipos gerados marcam todo retorno de RETURNS TABLE como
    // nao-nulo — o gerador nao infere nulidade de funcao. Na pratica
    // last_transcription e full_name vem null para quem nunca transcreveu, e
    // e o AdminUser abaixo que declara isso corretamente. Consuma o RPC por
    // aqui, nao direto.
    return (data ?? []).map(
      (row): AdminUser => ({
        id: row.id,
        email: row.email ?? "",
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        created_at: row.created_at,
        transcription_count: Number(row.transcription_count),
        last_transcription: row.last_transcription,
      }),
    );
  });
