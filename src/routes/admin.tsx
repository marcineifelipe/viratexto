import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminUsers,
  getTranscriptionHealth,
  type AdminUser,
  type TranscriptionHealth,
} from "@/functions/adminFunctions";
import { isAdminEmail } from "@/lib/admin";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Users,
  FileAudio,
  Calendar,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  Timer,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — ViraTexto" }],
  }),
  component: AdminPanel,
});

/** Mesmo default de stuck_after_minutes da RPC admin_transcription_health. */
const STUCK_AFTER_MIN = 10;

/** Tarifa do whisper-1 por minuto. Confira em openai.com/pricing se mudar. */
const WHISPER_USD_PER_MIN = 0.006;

function formatUsd(value: number) {
  return `US$ ${value.toFixed(2)}`;
}

function formatRate(health: TranscriptionHealth) {
  if (health.total_30d === 0) return "sem transcrições no período";
  const rate = (health.done_30d / health.total_30d) * 100;
  return `${rate.toFixed(0)}% concluídas`;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function mostRecentTranscription(users: AdminUser[]) {
  return users.reduce<string | null>((latest, u) => {
    if (!u.last_transcription) return latest;
    if (!latest || Date.parse(u.last_transcription) > Date.parse(latest)) {
      return u.last_transcription;
    }
    return latest;
  }, null);
}

function AdminPanel() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [health, setHealth] = useState<TranscriptionHealth | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!isAdminEmail(user.email)) {
      navigate({ to: "/" });
      return;
    }

    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) throw new Error("Sessão inválida");

        const headers = { authorization: `Bearer ${token}` };
        const [result, healthResult] = await Promise.all([
          getAdminUsers({ headers }),
          getTranscriptionHealth({ headers }),
        ]);
        setUsers(result);
        setHealth(healthResult);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro ao carregar usuários");
      } finally {
        setFetching(false);
      }
    })();
  }, [user, loading, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  // Enquanto nao houver admin confirmado, segura o loader: sem isso o shell do
  // painel pisca para deslogado/nao-admin antes de o redirect do effect rodar.
  if (loading || !isAdminEmail(user?.email) || fetching) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="animate-spin text-primary w-6 h-6" />
      </div>
    );
  }

  const totalTranscriptions = users.reduce((s, u) => s + u.transcription_count, 0);
  const lastTranscription = mostRecentTranscription(users);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="font-semibold text-slate-800">Painel Admin</span>
          <Badge variant="secondary" className="text-xs">
            ViraTexto
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            label="Usuários cadastrados"
            value={users.length}
            bg="bg-blue-50"
          />
          <SummaryCard
            icon={<FileAudio className="w-5 h-5 text-violet-600" />}
            label="Transcrições totais"
            value={totalTranscriptions}
            bg="bg-violet-50"
          />
          <SummaryCard
            icon={<Calendar className="w-5 h-5 text-emerald-600" />}
            label="Transcrição mais recente"
            value={fmtDate(lastTranscription)}
            bg="bg-emerald-50"
          />
        </div>

        {/* Saúde das transcrições */}
        {health && (
          <div className="mb-8 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                icon={
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      health.failures_7d > 0 ? "text-red-600" : "text-slate-400",
                    )}
                  />
                }
                label="Falhas (7 dias)"
                value={health.failures_7d}
                bg={health.failures_7d > 0 ? "bg-red-50" : "bg-slate-100"}
                alert={health.failures_7d > 0}
              />
              <SummaryCard
                icon={
                  <Timer
                    className={cn(
                      "h-5 w-5",
                      health.stuck > 0 ? "text-amber-600" : "text-slate-400",
                    )}
                  />
                }
                label={`Travadas (> ${STUCK_AFTER_MIN} min)`}
                value={health.stuck}
                bg={health.stuck > 0 ? "bg-amber-50" : "bg-slate-100"}
                alert={health.stuck > 0}
              />
              <SummaryCard
                icon={<Clock3 className="h-5 w-5 text-indigo-600" />}
                label="Minutos transcritos (30 dias)"
                value={`${health.minutes_30d.toFixed(1)} min`}
                hint={`≈ ${formatUsd(health.minutes_30d * WHISPER_USD_PER_MIN)} · ${formatRate(health)}`}
                bg="bg-indigo-50"
              />
            </div>

            {health.problems.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-4">
                  <h2 className="font-semibold text-slate-800">Problemas recentes</h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {health.problems.map((p) => (
                    <li key={p.id} className="px-6 py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-slate-700">{p.title}</span>
                        <span className="text-xs text-slate-400">{fmt(p.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-red-600">
                        {p.status === "error"
                          ? (p.error ?? "Erro sem mensagem registrada.")
                          : `Parada em "${p.status}" desde a criação.`}
                      </p>
                      {p.email && <p className="mt-0.5 text-xs text-slate-500">{p.email}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tabela de usuários */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Usuários cadastrados</h2>
          </div>

          {error ? (
            <div className="px-6 py-10 text-center text-red-500 text-sm">{error}</div>
          ) : users.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-6 py-3 font-medium">Email</th>
                    <th className="text-left px-6 py-3 font-medium">Nome</th>
                    <th className="text-left px-6 py-3 font-medium">Cadastro</th>
                    <th className="text-center px-6 py-3 font-medium">Transcrições</th>
                    <th className="text-left px-6 py-3 font-medium">Última transcrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {u.email || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {u.full_name || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{fmt(u.created_at)}</td>
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={u.transcription_count > 0 ? "default" : "secondary"}
                          className="tabular-nums"
                        >
                          {u.transcription_count}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{fmt(u.last_transcription)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  bg,
  hint,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
  /** Linha menor abaixo do número, para contexto (custo, taxa). */
  hint?: string;
  /** Destaca a borda quando o número exige atenção. */
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-5 flex items-center gap-4 shadow-sm",
        alert ? "border-red-200" : "border-slate-200",
      )}
    >
      <div className={`${bg} p-3 rounded-lg`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={cn("text-2xl font-bold", alert ? "text-red-700" : "text-slate-800")}>
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
