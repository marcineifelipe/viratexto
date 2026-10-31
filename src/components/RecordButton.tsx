import { useRef, useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  onRecorded: (file: File) => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export function RecordButton({ onRecorded }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/ogg";

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const ext = mimeType.split("/")[1].split(";")[0];
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (!blob.size) {
          toast.error("Gravação vazia — tente novamente.");
          setSeconds(0);
          return;
        }
        const file = new File([blob], `gravacao_${Date.now()}.${ext}`, { type: mimeType });
        toast.info(`Gravação pronta: ${(file.size / 1024).toFixed(0)} KB — abrindo transcrição...`);
        onRecorded(file);
        setSeconds(0);
      };

      mr.start(250); // coleta chunks a cada 250ms
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <Button
      variant={recording ? "destructive" : "ghost"}
      size="sm"
      onClick={recording ? stop : start}
      className="gap-2"
    >
      {recording ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <Square className="w-4 h-4 fill-current" />
          {formatTime(seconds)}
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          GRAVAR
        </>
      )}
    </Button>
  );
}
