import { transcribe, whisperReady } from "@/lib/whisper";
import { getProfile } from "@/lib/queries";

export async function GET() {
  return Response.json(whisperReady());
}

export async function POST(req: Request) {
  const ready = whisperReady();
  if (!ready.ok) return Response.json({ error: `Whisper is not set up (missing ${ready.missing})` }, { status: 503 });
  // 16 kHz mono 16-bit is ~1.9 MB a minute; 10 MB is about 5 minutes
  if (Number(req.headers.get("content-length")) > 10 * 1024 * 1024) return Response.json({ error: "Recording is too long" }, { status: 413 });
  const wav = Buffer.from(await req.arrayBuffer());
  if (wav.length > 10 * 1024 * 1024) return Response.json({ error: "Recording is too long" }, { status: 413 });
  if (wav.length < 1000) return Response.json({ error: "Recording was empty" }, { status: 400 });
  const started = Date.now();
  try {
    const text = await transcribe(wav, getProfile().voice_language ?? "en");
    return Response.json({ text, ms: Date.now() - started });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
