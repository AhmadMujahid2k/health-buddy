import { transcribe, whisperReady } from "@/lib/whisper";
import { getProfile } from "@/lib/queries";

export async function GET() {
  return Response.json(whisperReady());
}

export async function POST(req: Request) {
  const ready = whisperReady();
  if (!ready.ok) return Response.json({ error: `Whisper is not set up (missing ${ready.missing})` }, { status: 503 });
  const wav = Buffer.from(await req.arrayBuffer());
  if (wav.length < 1000) return Response.json({ error: "Recording was empty" }, { status: 400 });
  const started = Date.now();
  try {
    const text = await transcribe(wav, getProfile().voice_language ?? "en");
    return Response.json({ text, ms: Date.now() - started });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
