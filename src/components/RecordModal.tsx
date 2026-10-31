import { useRef, useState } from "react";
import { Mic, Square, RotateCcw, Captions, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onTranscribe: (file: File) => void;
}

type Stage = "idle" | "recording" | "done";

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function RecordModal({ open, onOpenChange, onTranscribe }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [seconds, setSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stream?.getTracks().forEach((t) => t.stop());
    setStage("idle");
    setSeconds(0);
    setRecordedFile(null);
    chunksRef.current = [];
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Deixa o browser escolher o formato nativo — mais compatível e garante blob não-vazio
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        // Usa o mimeType real que o browser usou (não o que pedimos)
        const actualMime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });

        if (!blob.size) {
          toast.error("Gravação vazia — tente novamente.");
          setStage("idle");
          return;
        }

        // Extrai extensão limpa: "audio/webm;codecs=opus" → "webm"
        const ext = actualMime.split(";")[0].split("/")[1] || "webm";
        const file = new File([blob], `gravacao_${Date.now()}.${ext}`, { type: actualMime });
        setRecordedFile(file);
        setStage("done");
      };

      mr.start(1000); // chunk a cada 1s — mais estável que 250ms
      mediaRef.current = mr;
      setStage("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
  };

  const handleTranscribe = () => {
    if (!recordedFile) return;
    onOpenChange(false);
    reset();
    onTranscribe(recordedFile);
  };

  const handleRetry = () => {
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 border-b px-6 py-5 text-left text-lg">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Mic className="h-5 w-5" />
            </span>
            <span>
              <span className="block">Gravação de áudio</span>
              <span className="block text-sm font-normal text-muted-foreground">
                {stage === "idle" && "Clique em gravar para começar"}
                {stage === "recording" && "Gravando..."}
                {stage === "done" && "Gravação concluída"}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 px-6 py-8">
          {/* Idle */}
          {stage === "idle" && (
            <button
              onClick={startRecording}
              className="group relative grid h-28 w-28 place-items-center rounded-full bg-primary/10 transition-all hover:bg-primary/20 active:scale-95"
            >
              <Mic className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
            </button>
          )}

          {/* Recording */}
          {stage === "recording" && (
            <>
              <div className="relative grid h-28 w-28 place-items-center">
                {/* Ondas pulsantes */}
                <span className="absolute h-28 w-28 animate-ping rounded-full bg-red-500/20" />
                <span className="absolute h-20 w-20 animate-ping rounded-full bg-red-500/20 [animation-delay:0.3s]" />
                <button
                  onClick={stopRecording}
                  className="relative z-10 grid h-20 w-20 place-items-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:bg-red-600 active:scale-95"
                >
                  <Square className="h-8 w-8 fill-white" />
                </button>
              </div>

              <div className="text-center">
                <p className="font-mono text-3xl font-bold tabular-nums text-red-500">
                  {formatTime(seconds)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Clique para parar</p>
              </div>
            </>
          )}

          {/* Done */}
          {stage === "done" && recordedFile && (
            <>
              <div className="grid h-28 w-28 place-items-center rounded-full bg-green-100">
                <Mic className="h-10 w-10 text-green-600" />
              </div>

              <div className="text-center">
                <p className="text-base font-semibold">Pronto!</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(seconds)} · {(recordedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>

              <div className="flex w-full flex-col gap-2">
                <Button onClick={handleTranscribe} className="h-11 w-full text-base font-semibold">
                  <Captions className="mr-2 h-4 w-4" />
                  Transcrever áudio
                </Button>
                <Button variant="outline" onClick={handleRetry} className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Gravar novamente
                </Button>
                <Button variant="ghost" onClick={() => handleClose(false)} className="w-full text-muted-foreground">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Descartar
                </Button>
              </div>
            </>
          )}

          {stage === "idle" && (
            <p className="text-sm text-muted-foreground">
              Certifique-se de que o microfone está permitido no navegador.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
