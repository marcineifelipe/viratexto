const TARGET_SAMPLE_RATE = 16000;
// Bitrates mono validos para MPEG-2 Layer III em 16 kHz, do melhor para o menor.
const BITRATE_LADDER_KBPS = [64, 48, 40, 32, 24, 16];
// Margem para o overhead de headers/VBR do MP3.
const SIZE_HEADROOM = 0.9;
// Amostras processadas por fatia (multiplo de 1152, o frame do MP3).
const SAMPLES_PER_CHUNK = 1152 * 50;

export type OptimizedAudio = {
  file: File;
  originalSize: number;
  optimizedSize: number;
  bitrateKbps: number;
};

export type OptimizeOptions = {
  /** Tamanho maximo aceito para o arquivo final, em bytes. */
  maxBytes?: number;
  /** Progresso da codificacao, de 0 a 1. */
  onProgress?: (ratio: number) => void;
};

function pickBitrateKbps(durationSeconds: number, maxBytes?: number) {
  if (!maxBytes || durationSeconds <= 0) return BITRATE_LADDER_KBPS[0];
  const budget = maxBytes * SIZE_HEADROOM;
  const fitting = BITRATE_LADDER_KBPS.find((kbps) => (kbps * 1000 * durationSeconds) / 8 <= budget);
  return fitting ?? BITRATE_LADDER_KBPS[BITRATE_LADDER_KBPS.length - 1];
}

function toInt16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
}

async function encodeMp3(
  samples: Float32Array,
  sampleRate: number,
  bitrateKbps: number,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  // Carregado sob demanda: o encoder so e necessario quando ha otimizacao.
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const encoder = new Mp3Encoder(1, sampleRate, bitrateKbps);
  const pcm = toInt16(samples);
  const parts: Uint8Array[] = [];

  for (let offset = 0; offset < pcm.length; offset += SAMPLES_PER_CHUNK) {
    const chunk = pcm.subarray(offset, Math.min(offset + SAMPLES_PER_CHUNK, pcm.length));
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) parts.push(encoded);
    onProgress?.(Math.min(1, (offset + chunk.length) / pcm.length));
    // Devolve o controle ao navegador para a UI nao travar em audios longos.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const tail = encoder.flush();
  if (tail.length > 0) parts.push(tail);
  onProgress?.(1);

  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}

async function resampleToMono(buffer: AudioBuffer): Promise<AudioBuffer> {
  const frameCount = Math.ceil(buffer.duration * TARGET_SAMPLE_RATE);
  if (frameCount < 1) throw new Error("O arquivo nao contem audio.");
  const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

function optimizedName(originalName: string) {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return `${baseName}.optimized.mp3`;
}

export async function optimizeAudioForTranscription(
  file: File,
  options: OptimizeOptions = {},
): Promise<OptimizedAudio> {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Seu navegador nao suporta otimizacao de audio.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const context = new AudioContextClass();
  try {
    let decoded: AudioBuffer;
    try {
      decoded = await context.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      throw new Error(
        "Nao foi possivel ler o audio deste arquivo. Tente converter para MP3 ou WAV.",
      );
    }

    const mono = await resampleToMono(decoded);
    const bitrateKbps = pickBitrateKbps(mono.duration, options.maxBytes);
    const mp3 = await encodeMp3(
      mono.getChannelData(0),
      mono.sampleRate,
      bitrateKbps,
      options.onProgress,
    );

    const optimizedFile = new File([mp3], optimizedName(file.name), {
      type: "audio/mpeg",
      lastModified: Date.now(),
    });

    return {
      file: optimizedFile,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      bitrateKbps,
    };
  } finally {
    await context.close();
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
