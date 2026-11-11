import { fmt } from "@/lib/calc";
import type { Week } from "@/lib/weekly";

/** Weekly averages and totals, newest first. `limit` shows only the latest weeks; changes still compare with the week before. */
export function WeeklyTable({ weeks, today: t, limit }: { weeks: Week[]; today: string; limit?: number }) {
  return (
    <table className="w-full min-w-[760px] text-sm">
      <thead className="text-left text-xs text-muted uppercase">
        <tr className="[&>th]:pb-1.5 [&>th]:font-semibold">
          <th rowSpan={2} className="align-bottom">Week</th>
          <th colSpan={4} className="border-b border-line">Daily average</th>
          <th className="w-4" rowSpan={2} />
          <th colSpan={3} className="border-b border-line">Week total</th>
          <th rowSpan={2} className="align-bottom">On target</th>
        </tr>
        <tr className="[&>th]:pt-1.5 [&>th]:pb-2 [&>th]:font-semibold">
          <th>Weight</th><th>Intake</th><th>Protein</th><th>Steps</th>
          <th>Deficit</th><th>Fat lost</th><th>Distance</th>
        </tr>
      </thead>
      <tbody>
        {weeks.slice(0, limit).map((w, i) => {
          const prev = weeks[i + 1];
          // totals of an unfinished week aren't comparable with a full one
          // a week is finished once its last day is over (today still counts as in progress)
          const finished = w.days === 7 && w.end < t;
          const prevTotal = finished ? prev : undefined;
          return (
            <tr key={w.week} className="border-t border-line align-top [&>td]:py-2.5">
              <td className="font-semibold">
                Week {w.week}
                <div className="text-xs font-normal text-muted">
                  {new Date(w.start + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {!finished ? ` · day ${w.days} of 7` : ""}
                </div>
              </td>
              <td>
                {w.avgWeight != null ? `${fmt(w.avgWeight, 2)} kg` : "–"}
                <Delta now={w.avgWeight} before={prev?.avgWeight} digits={2} unit=" kg" better="down" />
              </td>
              <td>
                {w.avgIntake != null ? `${fmt(w.avgIntake)} kcal` : "–"}
                <Delta now={w.avgIntake} before={prev?.avgIntake} unit=" kcal" />
              </td>
              <td>
                {w.avgProtein != null ? `${fmt(w.avgProtein)} g` : "–"}
                <Delta now={w.avgProtein} before={prev?.avgProtein} unit=" g" better="up" />
              </td>
              <td>
                {w.avgSteps != null ? fmt(w.avgSteps) : "–"}
                <Delta now={w.avgSteps} before={prev?.avgSteps} better="up" />
              </td>
              <td />
              <td>
                {fmt(w.deficit)} kcal
                <Delta now={w.deficit} before={prevTotal?.deficit} unit=" kcal" better="up" />
              </td>
              <td className="font-semibold text-good">
                {fmt(w.deficit / 7700, 2)} kg
                <Delta now={w.deficit / 7700} before={prevTotal ? prevTotal.deficit / 7700 : null} digits={2} unit=" kg" better="up" />
              </td>
              <td>
                {w.km ? `${fmt(w.km, 1)} km` : "–"}
                <Delta now={w.km || null} before={prevTotal?.km || null} digits={1} unit=" km" better="up" />
              </td>
              <td>{w.onTarget}/{w.logged} days</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Change from the previous week, coloured by which direction is good (neutral when there's no "better"). */
function Delta({
  now, before, digits = 0, unit = "", better,
}: { now: number | null | undefined; before: number | null | undefined; digits?: number; unit?: string; better?: "up" | "down" }) {
  if (now == null || before == null) return null;
  const d = now - before;
  if (Math.abs(d) < 0.5 * 10 ** -digits) return <div className="text-xs font-semibold text-muted">– 0{unit}</div>;
  const good = better ? (better === "up" ? d > 0 : d < 0) : null;
  const tone = good == null ? "text-muted" : good ? "text-good" : "text-bad";
  return (
    <div className={`text-xs font-semibold ${tone}`}>
      {d < 0 ? "▼" : "▲"} {fmt(Math.abs(d), digits)}{unit}
    </div>
  );
}
