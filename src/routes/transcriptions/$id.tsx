import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Copy, Loader2, FileAudio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/transcriptions/$id")({
  component: TranscriptionPage,
});

type Segment = { start: number; end: number; text: string; speaker?: string | null };

type Row = {
  id: string; title: string; status: string; text: string | null;
  segments: Segment[] | null; speakers: string[] | null; duration: number | null;
  file_path: string; file_name: string | null; error: string | null;
};

function TranscriptionPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(6);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("transcriptions").select("*").eq("id", id).single();
      setRow(data as any);
      if (data?.file_path) {
        const { data: signed } = await supabase.storage.from("audio-files").createSignedUrl(data.file_path, 3600);
        setAudioUrl(signed?.signedUrl ?? null);
      }
    };
    load();
    const channel = supabase.channel(`transcription-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transcriptions", filter: `id=eq.${id}` },
        (payload) => setRow(payload.new as any))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => {
    if (!row) return;

    if (row.status === "done") {
      setProgress(100);
      return;
    }

    if (row.status === "error") {
      setProgress(0);
      return;
    }

    setProgress((current) => Math.max(current, row.status === "processing" ? 22 : 8));
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const ceiling = row.status === "processing" ? 94 : 18;
        if (current >= ceiling) return current;
        const step = current < 55 ? 4 : current < 80 ? 2 : 1;
        return Math.min(current + step, ceiling);
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [row?.status]);

  if (!row) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;

  const copy = () => {
    if (!row.text) return;
    navigator.clipboard.writeText(row.text);
    toast.success("Copiado!");
  };

  const downloadTxt = () => {
    if (!row.text) return;
    const blob = new Blob([row.text], { type: "text/plain" });
    triggerDownload(blob, `${row.title}.txt`);
  };

  const downloadSrt = () => {
    if (!row.segments?.length) return;
    const srt = row.segments.map((s, i) =>
      `${i + 1}\n${fmtTime(s.start)} --> ${fmtTime(s.end)}\n${s.speaker ? `[${s.speaker}] ` : ""}${s.text}\n`
    ).join("\n");
    triggerDownload(new Blob([srt], { type: "application/x-subrip" }), `${row.title}.srt`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <FileAudio className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold truncate flex-1">{row.title}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {audioUrl && (
          <Card className="p-4">
            <audio controls src={audioUrl} className="w-full" />
          </Card>
        )}

        {row.status !== "done" ? (
          <Card className="p-12 text-center">
            {row.status === "error" ? (
              <>
                <p className="text-red-600 font-semibold">Erro na transcrição</p>
                <p className="text-sm text-muted-foreground mt-2">{row.error}</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <div className="mx-auto max-w-md space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="font-medium">
                      {row.status === "processing" ? "Transcrevendo..." : "Aguardando processamento..."}
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress < 25
                      ? "Preparando o arquivo para a IA."
                      : progress < 70
                        ? "Analisando o audio e montando os trechos."
                        : "Finalizando texto, tempos e exportacoes."}
                  </p>
                </div>
              </>
            )}
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copy} variant="outline" size="sm"><Copy className="w-4 h-4 mr-2" />Copiar texto</Button>
              <Button onClick={downloadTxt} variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Baixar TXT</Button>
              {row.segments?.length ? (
                <Button onClick={downloadSrt} variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Baixar SRT</Button>
              ) : null}
              {row.speakers?.length ? (
                <span className="ml-auto text-xs text-muted-foreground self-center">
                  Locutores detectados: {row.speakers.join(", ")}
                </span>
              ) : null}
            </div>

            <Card className="p-6">
              {row.segments?.length ? (
                <div className="space-y-3">
                  {row.segments.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-xs text-muted-foreground font-mono w-20 shrink-0 pt-0.5">
                        {fmtTimeShort(s.start)}
                      </span>
                      <div className="flex-1">
                        {s.speaker && <span className="font-semibold text-primary mr-2">{s.speaker}:</span>}
                        <span>{s.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{row.text}</p>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}
function fmtTimeShort(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${pad(m)}:${pad(s)}`;
}
function pad(n: number) { return String(n).padStart(2, "0"); }

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
