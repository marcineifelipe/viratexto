import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// whisper-1 funciona em todos os tiers da OpenAI.
// Atualize para gpt-4o-mini-transcribe / gpt-4o-transcribe quando atingir Tier 2.
const MODE_MODEL: Record<string, string> = {
  cheetah: 'whisper-1',
  dolphin: 'whisper-1',
  whale: 'whisper-1',
};

const OPENAI_MAX_SIZE_MB = 25;
const OPENAI_MAX_SIZE_BYTES = OPENAI_MAX_SIZE_MB * 1024 * 1024;

// ISO 639-1 codes for Whisper (null = auto-detect)
const LANG_CODE: Record<string, string | null> = {
  pt: 'pt',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  zh: 'zh',
  auto: null,
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg',
    opus: 'audio/opus', m4a: 'audio/mp4', aac: 'audio/aac', wma: 'audio/x-ms-wma',
    webm: 'audio/webm',  // MediaRecorder grava como audio/webm (não video)
    mp4: 'video/mp4', mov: 'video/quicktime',
    mpeg: 'video/mpeg', mpg: 'video/mpeg', wmv: 'video/x-ms-wmv',
  };
  return map[ext] ?? 'application/octet-stream';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let transcriptionId: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization' }, 401);

    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY');
    const openaiKey = getRequiredEnv('OPENAI_API_KEY');

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    transcriptionId = body.transcriptionId;
    if (!transcriptionId) return jsonResponse({ error: 'transcriptionId required' }, 400);

    const { data: row, error: rowErr } = await admin
      .from('transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .eq('user_id', user.id)
      .single();
    if (rowErr || !row) return jsonResponse({ error: 'Not found' }, 404);

    await admin.from('transcriptions').update({ status: 'processing' }).eq('id', row.id);

    // Download audio file from storage
    const { data: fileData, error: dlErr } = await admin.storage
      .from('audio-files')
      .download(row.file_path);
    if (dlErr || !fileData) throw new Error('Download failed: ' + dlErr?.message);

    if (fileData.size > OPENAI_MAX_SIZE_BYTES) {
      const userMsg = `Arquivo muito grande. Limite do Whisper: ${OPENAI_MAX_SIZE_MB}MB.`;
      await admin.from('transcriptions').update({ status: 'error', error: userMsg }).eq('id', row.id);
      return jsonResponse({ error: userMsg }, 413);
    }

    const buf = await fileData.arrayBuffer();
    const model = MODE_MODEL[row.mode] ?? MODE_MODEL.dolphin;
    const langCode = LANG_CODE[row.language] ?? null;
    const fileName = row.file_name ?? row.file_path.split('/').pop() ?? 'audio.mp3';
    const mime = mimeFromName(fileName);

    // Call OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([buf], { type: mime }), fileName);
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    if (langCode) formData.append('language', langCode);

    const aiResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('OpenAI error', aiResp.status, errText);
      let userMsg = 'Erro na transcrição.';
      if (aiResp.status === 429) userMsg = 'Limite de uso atingido. Tente novamente em instantes.';
      if (aiResp.status === 401) userMsg = 'Chave OpenAI inválida. Verifique o secret OPENAI_API_KEY.';
      await admin.from('transcriptions').update({ status: 'error', error: userMsg }).eq('id', row.id);
      return jsonResponse({ error: userMsg, details: errText }, aiResp.status);
    }

    const aiJson = await aiResp.json();

    const segments = (aiJson.segments ?? []).map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      speaker: null, // Whisper não suporta diarização nativa
    }));

    await admin.from('transcriptions').update({
      status: 'done',
      text: aiJson.text,
      segments,
      speakers: null,
      duration: aiJson.duration ?? null,
    }).eq('id', row.id);

    return jsonResponse({ ok: true });

  } catch (e) {
    console.error('transcribe error:', e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    try {
      if (transcriptionId) {
        const admin = createClient(
          getRequiredEnv('SUPABASE_URL'),
          getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
        );
        await admin.from('transcriptions').update({ status: 'error', error: msg }).eq('id', transcriptionId);
      }
    } catch {}
    return jsonResponse({ error: msg }, 500);
  }
});
