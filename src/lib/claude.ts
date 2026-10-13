import "server-only";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DraftItem } from "./types";

/**
 * Calorie estimates from Claude Code in headless mode (`claude -p`).
 * Runs on the user's own Claude subscription — no API key or credits.
 */

const CANDIDATES = [process.env.CLAUDE_BIN, path.join(os.homedir(), ".local/bin/claude"), "/usr/local/bin/claude"];

export function claudeBin(): string | null {
  for (const c of CANDIDATES) if (c && fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  return null;
}

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short food name, e.g. 'Aloo matar rice'" },
          alias: { type: "string", description: "Comma-separated lowercase names the user might type for this food, e.g. 'aloo matar rice,aloo matar chawal'" },
          qty: { type: "number" },
          unit: { type: "string", description: "Simple unit, e.g. piece, cup, bowl, plate, spoon, slice" },
          kcal_per_unit: { type: "number" },
          protein_per_unit: { type: "number" },
          source_text: { type: "string", description: "The part of the user's text this item came from" },
          meal: {
            type: "string",
            enum: ["breakfast", "lunch", "snack", "dinner", "drink", "none"],
            description: "Copy the [meal] tag of the line this food came from, or 'none' if the line has no tag",
          },
        },
        required: ["name", "alias", "qty", "unit", "kcal_per_unit", "protein_per_unit", "source_text", "meal"],
      },
    },
  },
  required: ["items"],
};

// Personal details (where the user lives, how their food is cooked, their chai recipe…) come from
// Settings → "About your food" (profile.food_context), not from the code.
const CONTEXT = `You estimate calories and protein for a personal food log.
Rules:
- Use typical home portions for the user's cuisine. Restaurant food usually has more oil than home cooking.
- Respect quantities and size words (small, big, half, 4-5 spoons = 4.5 spoons).
- One dish = one item. 'aloo matar rice', 'chicken pulao', 'daal chawal' are single dishes. Only split foods that are clearly separate (e.g. '1 bowl haleem with naan' = haleem + naan).
- Names must be specific ("Aloo matar rice", not "Rice").
- If something is not food or drink (times, weight, steps, feelings), skip it.
- Lines may start with a [meal] tag; copy it into each item's "meal".
- A line marked "(already counted: …)" has foods that are ALREADY logged. Return only foods from that line that are
  NOT in the already-counted list (e.g. "shorba" alongside a counted boti). If everything is covered, return nothing for it.
- Return per-unit values; qty x per-unit = total. Be realistic, not optimistic.`;

export interface ClaudeItem extends DraftItem {
  alias: string;
  meal: string;
  kcal_per_unit: number;
  protein_per_unit: number;
}

export async function estimateWithClaude(lines: string[], model = "sonnet", userContext?: string | null): Promise<ClaudeItem[]> {
  const bin = claudeBin();
  if (!bin) throw new Error("Claude CLI not found. Install it with: curl -fsSL https://claude.ai/install.sh | bash");
  const about = userContext?.trim() ? `\nAbout this user's food:\n${userContext.trim()}\n` : "";
  const prompt = `${CONTEXT}\n${about}\nFood log:\n${lines.map((l) => `- ${l}`).join("\n")}`;
  const args = [
    "-p", prompt,
    "--model", model,
    "--output-format", "json",
    "--json-schema", JSON.stringify(SCHEMA),
    "--tools", "",
    "--setting-sources", "",
    "--no-session-persistence",
  ];
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(/*turbopackIgnore: true*/ bin, args, { cwd: os.tmpdir(), timeout: 120_000, maxBuffer: 4 * 1024 * 1024 }, (err, out, errOut) => {
      if (err) reject(new Error(`Claude failed: ${errOut?.trim() || err.message}`));
      else resolve(out);
    });
  });
  const res = JSON.parse(stdout);
  if (res.is_error) throw new Error(`Claude error: ${res.result ?? "unknown"}`);
  const data = res.structured_output ?? JSON.parse(res.result);
  return (data.items as Array<Record<string, unknown>>).map((it) => {
    const qty = Number(it.qty) || 1;
    const kpu = Number(it.kcal_per_unit) || 0;
    const ppu = Number(it.protein_per_unit) || 0;
    return {
      name: String(it.name),
      alias: String(it.alias ?? it.name).toLowerCase(),
      qty,
      unit: String(it.unit),
      kcal: Math.round(kpu * qty),
      protein: Math.round(ppu * qty * 10) / 10,
      kcal_per_unit: kpu,
      protein_per_unit: ppu,
      food_id: null,
      estimated_by: "claude" as const,
      text: String(it.source_text ?? ""),
      meal: String(it.meal ?? "none"),
    };
  });
}
