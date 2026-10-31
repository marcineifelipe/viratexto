import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Upload, LogOut, Loader2, FileAudio, Trash2, Mic, Plus, Clock, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { TranscribeModal } from "@/components/TranscribeModal";
import { RecordModal } from "@/components/RecordModal";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViraTexto - Transcricao de audio e video com IA" },
      { name: "description", content: "Transcreva áudios e vídeos rapidamente com IA. Suporte a português, identificação de locutores e exportação em TXT e SRT." },
    ],
  }),
  component: Dashboard,
});

type Row = {
  id: string; title: string; status: string; mode: string;
  language: string; created_at: string; duration: number | null; error: string | null;
};

/**
 * Nome de exibicao vindo do metadata do proprio usuario: o Google preenche
 * full_name/name no OAuth e o cadastro por email envia full_name no signUp.
 * Cai para o trecho antes do @ so quando nao ha nome nenhum.
 */
function greetingName(user: User) {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const fullName = (meta?.full_name ?? meta?.name ?? "").trim();
  if (fullName) return fullName.split(/\s+/)[0];

  const local = user.email?.split("@")[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "usuário";
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("transcriptions")
        .select("id,title,status,mode,language,created_at,duration,error")
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setListLoading(false);
    };
    load();
    const channel = supabase.channel("transcriptions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transcriptions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  const handleTranscribeRecording = useCallback((f: File) => {
    setInitialFile(f);
    setOpen(true);
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta transcrição?")) return;
    await supabase.from("transcriptions").delete().eq("id", id);
    toast.success("Excluída");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setInitialFile(file); setOpen(true); }
  };

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>;
  }

  const firstName = greetingName(user);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileAudio className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-primary">ViraTexto</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdminEmail(user.email) && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/admin">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setRecordOpen(true)}>
              <Mic className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">Gravar</span>
            </Button>
            <Button size="sm" className="gap-2" onClick={() => { setInitialFile(null); setOpen(true); }}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova transcrição</span>
            </Button>
            <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
            <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[160px]">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Olá, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Suas transcrições ficam salvas aqui.</p>
        </div>

        {listLoading ? (
          <div className="py-24 grid place-items-center">
            <Loader2 className="animate-spin text-primary w-6 h-6" />
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => { setInitialFile(null); setOpen(true); }}
            className={`
              cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-16
              flex flex-col items-center justify-center text-center gap-4
              ${dragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50"}
            `}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Arraste um arquivo aqui</h3>
              <p className="text-sm text-muted-foreground mt-1">ou clique para escolher um áudio ou vídeo</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {["MP3", "MP4", "WAV", "M4A", "WEBM"].map(f => (
                <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">{f}</span>
              ))}
            </div>
            <div className="flex gap-3 mt-2" onClick={e => e.stopPropagation()}>
              <Button size="sm" onClick={() => { setInitialFile(null); setOpen(true); }}>
                <Upload className="w-4 h-4 mr-2" /> Enviar arquivo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRecordOpen(true)}>
                <Mic className="w-4 h-4 mr-2 text-red-500" /> Gravar áudio
              </Button>
            </div>
          </div>
        ) : (
          /* File list */
          <div>
            {/* Drop zone banner */}
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`
                mb-4 rounded-xl border-2 border-dashed p-4 flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer
                ${dragging ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 bg-white"}
              `}
              onClick={() => { setInitialFile(null); setOpen(true); }}
            >
              <Upload className={`w-4 h-4 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm text-muted-foreground">Arraste um arquivo aqui ou <span className="text-primary font-medium">clique para enviar</span></span>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {items.length} {items.length !== 1 ? "transcrições" : "transcrição"}
                </span>
              </div>
              <div className="divide-y">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileAudio className="w-4 h-4 text-primary" />
                    </div>
                    <Link to="/transcriptions/$id" params={{ id: it.id }} className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate text-sm">{it.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(it.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {it.duration ? ` • ${formatDuration(it.duration)}` : ""}
                      </p>
                    </Link>
                    <StatusBadge status={it.status} />
                    <Button
                      variant="ghost" size="icon"
                      className="shrink-0 text-muted-foreground hover:text-red-500"
                      onClick={() => remove(it.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <RecordModal
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onTranscribe={handleTranscribeRecording}
      />

      {open && (
        <TranscribeModal
          open={open}
          onOpenChange={(o) => { setOpen(o); if (!o) setInitialFile(null); }}
          onCreated={(id) => navigate({ to: "/transcriptions/$id", params: { id } })}
          userId={user.id}
          initialFile={initialFile}
        />
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    pending:    { label: "Pendente",        icon: <Clock className="w-3 h-3" />,        cls: "bg-slate-100 text-slate-600" },
    processing: { label: "Transcrevendo…",  icon: <RefreshCw className="w-3 h-3 animate-spin" />, cls: "bg-blue-50 text-blue-600" },
    done:       { label: "Pronto",          icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-green-50 text-green-600" },
    error:      { label: "Erro",            icon: <AlertCircle className="w-3 h-3" />,  cls: "bg-red-50 text-red-600" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium shrink-0 ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
