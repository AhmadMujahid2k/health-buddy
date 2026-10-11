"use client";
import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

/**
 * Records from the microphone, converts to 16 kHz mono WAV in the browser
 * (what whisper.cpp wants) and sends it to /api/transcribe on this laptop.
 * Browsers only allow the mic on https or localhost — this works at http://localhost:4782.
 */

const MAX_SECONDS = 60;

async function toWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const pcm = (await offline.startRendering()).getChannelData(0);

  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "working" | "off">("idle");
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // hide the button if the mic can't be used here (e.g. plain http on a phone) or whisper isn't installed
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setState("off");
      return;
    }
    fetch("/api/transcribe")
      .then((r) => r.json())
      .then((r) => !r.ok && setState("off"))
      .catch(() => setState("off"));
  }, []);

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true } });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        setState("working");
        try {
          const wav = await toWav16k(new Blob(chunks, { type: r.mimeType }));
          const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (data.text) onText(data.text);
          else setErr("Didn't catch that. Try again, a bit closer to the mic.");
        } catch (e) {
          setErr((e as Error).message);
        } finally {
          setState("idle");
        }
      };
      rec.current = r;
      r.start();
      setSecs(0);
      setState("recording");
      timer.current = setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_SECONDS) r.state === "recording" && r.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setErr("Microphone blocked. Allow it in the browser's site settings.");
    }
  }

  if (state === "off") return null;
  return (
    <>
      {state === "recording" ? (
        <button className="btn bg-bad" onClick={() => rec.current?.stop()}>
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> Stop · {secs}s
        </button>
      ) : (
        <button className="btn btn-ghost" onClick={start} disabled={state === "working"}>
          {state === "working" ? "Transcribing…" : <><Mic size={16} /> Speak</>}
        </button>
      )}
      {err && <span className="w-full text-sm text-bad">{err}</span>}
    </>
  );
}
