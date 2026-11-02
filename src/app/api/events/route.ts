import { getEvents, upsertEvent } from "@/lib/queries";
import { eventFromBody } from "./body";

export async function GET() {
  return Response.json(getEvents());
}

export async function POST(req: Request) {
  const e = eventFromBody(await req.json());
  if (!e) return Response.json({ error: "name and date (YYYY-MM-DD) are required" }, { status: 400 });
  return Response.json({ ok: true, id: upsertEvent(e) });
}
