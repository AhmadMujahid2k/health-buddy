import "server-only";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Local speech-to-text with whisper.cpp (built into ./whisper, see README).
 * Audio never leaves the laptop.
 */

const DIR = process.env.WHISPER_DIR ?? path.join(process.cwd(), "whisper");
const BIN = path.join(DIR, "build", "bin", "whisper-cli");
const MODEL = process.env.WHISPER_MODEL ?? path.join(DIR, "models", "ggml-small.bin");

// Biases Whisper towards how these foods are usually spelled in the log
const PROMPT =
  "Food log: 2 roti, chai no sugar, boiled egg, daal, sabzi, chicken boti, shami kabab, pulao, biryani, dahi, raita, naan, paratha, haleem, nihari, karahi, salan.";

export function whisperReady(): { ok: boolean; missing?: string } {
  if (!fs.existsSync(/*turbopackIgnore: true*/ BIN)) return { ok: false, missing: BIN };
  if (!fs.existsSync(/*turbopackIgnore: true*/ MODEL)) return { ok: false, missing: MODEL };
  return { ok: true };
}

/** `wav` must be 16 kHz mono 16-bit PCM — the browser converts before uploading. */
export async function transcribe(wav: Buffer, language = "en"): Promise<string> {
  const file = path.join(os.tmpdir(), `hb-voice-${process.pid}-${Date.now()}.wav`);
  fs.writeFileSync(/*turbopackIgnore: true*/ file, wav);
  try {
    const threads = String(Math.max(2, Math.min(8, os.cpus().length - 1)));
    const out = await new Promise<string>((resolve, reject) => {
      execFile(
        /*turbopackIgnore: true*/ BIN,
        ["-m", MODEL, "-f", file, "-l", language, "-t", threads, "-nt", "-np", "--prompt", PROMPT],
        { timeout: 120_000, maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => (err ? reject(new Error(stderr?.trim() || err.message)) : resolve(stdout)),
      );
    });
    return out
      .replace(/\[[^\]]*\]|\([^)]*\)/g, " ") // [BLANK_AUDIO], (music) …
      .replace(/\s+/g, " ")
      .trim();
  } finally {
    fs.rmSync(/*turbopackIgnore: true*/ file, { force: true });
  }
}
