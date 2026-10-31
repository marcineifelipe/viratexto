import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileAudio, Globe, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { optimizeAudioForTranscription } from "@/lib/audio-optimizer";

const ACCEPT = ".mp3,.mp4,.m4a,.mov,.aac,.wav,.ogg,.opus,.mpeg,.mpg,.wma,.wmv,.webm";
const MAX_SOURCE_SIZE_MB = 250;
const MAX_SOURCE_SIZE_BYTES = MAX_SOURCE_SIZE_MB * 1024 * 1024;
const MAX_TRANSCRIBE_SIZE_MB = 20;
const MAX_TRANSCRIBE_SIZE_BYTES = MAX_TRANSCRIBE_SIZE_MB * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
  userId: string;
  initialFile?: File | null;
}

const LANGUAGES = [
  { value: "pt", label: "🇧🇷 Português BR" },
  { value: "en", label: "🇺🇸 English" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "de", label: "🇩🇪 Deutsch" },
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "auto", label: "🌐 Detectar automaticamente" },
];

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      try {
        const body = (await response.clone().json()) as { error?: string; message?: string };
        return body.error || body.message || response.statusText;
      } catch {
        return response.statusText;
      }
    }
  }
  return error instanceof Error ? error.message : "Erro na transcrição";
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function TranscribeModal({ open, onOpenChange, onCreated, userId, initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [language, setLanguage] = useState("pt");

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Enviando...");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const submit = async () => {
    if (!file) return;
    if (file.size > MAX_SOURCE_SIZE_BYTES) {
      toast.error(`Arquivo muito grande. Limite: ${MAX_SOURCE_SIZE_MB}MB.`);
      return;
    }
    setBusy(true);
    setBusyLabel("Preparando...");

    // A linha nasce ANTES da otimizacao. Antes ela so era criada depois do
    // upload, entao toda falha de pre-upload (audio que nao decodifica,
    // otimizado acima do limite, upload recusado) morria num toast e nao
    // deixava rastro nenhum — o painel via 100% de sucesso.
    const { data: row, error: insErr } = await supabase
      .from("transcriptions")
      .insert({
        user_id: userId,
        title: file.name.replace(/\.[^.]+$/, ""),
        file_name: file.name,
        language,
        mode: "whale",
        diarize: false,
        status: "pending",
      })
      .select()
      .single();

    if (insErr || !row) {
      toast.error(insErr?.message ?? "Erro ao criar transcrição");
      setBusy(false);
      setBusyLabel("Enviando...");
      return;
    }

    try {
      let uploadFile = file;
      const shouldOptimize =
        file.type.startsWith("video/") || file.size > MAX_TRANSCRIBE_SIZE_BYTES;

      if (shouldOptimize) {
        setBusyLabel("Otimizando áudio...");
        const optimized = await optimizeAudioForTranscription(file, {
          maxBytes: MAX_TRANSCRIBE_SIZE_BYTES,
          onProgress: (ratio) => setBusyLabel(`Otimizando áudio... ${Math.round(ratio * 100)}%`),
        });
        if (optimized.optimizedSize > MAX_TRANSCRIBE_SIZE_BYTES) {
          throw new Error(
            `Áudio otimizado (${formatBytes(optimized.optimizedSize)}) ainda excede o limite de ${MAX_TRANSCRIBE_SIZE_MB}MB. Divida o arquivo em partes menores.`,
          );
        }
        // Um arquivo já bem comprimido pode ficar maior após o reencode — nesse caso mantém o original.
        if (optimized.optimizedSize < file.size || file.size > MAX_TRANSCRIBE_SIZE_BYTES) {
          uploadFile = optimized.file;
          const savedMb = (
            (optimized.originalSize - optimized.optimizedSize) /
            1024 /
            1024
          ).toFixed(1);
          if (optimized.optimizedSize < optimized.originalSize)
            toast.success(`Áudio otimizado — economia de ${savedMb}MB.`);
        }
      }

      setBusyLabel("Enviando áudio...");
      const safeName = uploadFile.name.replace(/[^\w.\-]/g, "_");
      const path = `${userId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("audio-files").upload(path, uploadFile);
      if (upErr) throw upErr;

      setBusyLabel("Iniciando transcrição...");
      const { error: updErr } = await supabase
        .from("transcriptions")
        .update({ file_path: path, file_name: uploadFile.name })
        .eq("id", row.id);
      if (updErr) throw updErr;

      supabase.functions
        .invoke("transcribe", { body: { transcriptionId: row.id } })
        .then(async ({ error }) => {
          if (error) toast.error("Erro na transcrição: " + (await getFunctionErrorMessage(error)));
        });

      toast.success("Transcrição iniciada!");
      onCreated(row.id);
      onOpenChange(false);
      setFile(null);
    } catch (e: any) {
      const message = e?.message ?? "Erro ao enviar";
      // Registra a falha na propria linha para ela aparecer no painel e na
      // lista do usuario, em vez de sumir junto com o toast.
      await supabase
        .from("transcriptions")
        .update({ status: "error", error: message })
        .eq("id", row.id);
      toast.error(message);
    } finally {
      setBusy(false);
      setBusyLabel("Enviando...");
    }
  };

  const willOptimize =
    file && (file.type.startsWith("video/") || file.size > MAX_TRANSCRIBE_SIZE_BYTES);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Nova transcrição</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Envie um arquivo ou use uma gravação para transcrever com IA.
            </p>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={cn(
                "relative rounded-xl border-2 border-dashed transition-all",
                file
                  ? "cursor-default border-primary/40 bg-primary/5"
                  : "cursor-pointer border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
                dragOver && "border-primary bg-primary/10 scale-[1.01]",
              )}
            >
              {file ? (
                <div className="flex items-center gap-4 p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10">
                    <FileAudio className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(file.size)}
                      {willOptimize && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          será otimizado
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
                    <UploadCloud className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Arraste ou clique para selecionar</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      MP3, MP4, WAV, MOV e mais · até {MAX_SOURCE_SIZE_MB}MB
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Idioma do áudio
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/20 px-6 py-4">
          <Button
            onClick={submit}
            disabled={!file || busy}
            className="h-11 w-full gap-2 text-base font-semibold"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {busyLabel}
              </>
            ) : (
              <>
                <FileAudio className="h-4 w-4" />
                Iniciar transcrição
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
