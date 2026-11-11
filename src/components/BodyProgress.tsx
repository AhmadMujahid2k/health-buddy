import { bmiCategory, fmt } from "@/lib/calc";

/**
 * Body progress card: three front-view figures (start, now, goal) drawn from BMI, side by side, with the start shape
 * faintly behind "now". It illustrates how weight changes the shape; it isn't a picture of the user, and the body-fat
 * figures are weight-only estimates.
 */

type Pt = [number, number];

/** 0 = lean, 1 = very heavy. BMI 18 → 0, BMI 40 → 1. */
const fatness = (bmi: number) => Math.min(1, Math.max(0, (bmi - 18) / 22));

/**
 * Right half of a figure 320 units tall (head top y=0, soles y=320), from the crown down to the crotch.
 * Proportions follow the classic 8-heads figure: shoulders ~y60, elbows at the waist, wrists at the crotch.
 */
function rightSide(f: number): Pt[] {
  const l = (a: number, b: number) => a + (b - a) * f;
  // torso half-widths
  const chest = l(25, 39);
  const lowChest = l(24, 40);
  const waist = l(21, 47);
  const belly = l(22, 50);
  const hip = l(25, 47);
  const thigh = l(24, 43);
  // arms hang just clear of the torso; heavier bodies push them out
  const gap = 2.5;
  const inTop = chest + 1;
  const inMid = Math.max(inTop, waist + gap, belly + gap);
  const inLow = Math.max(inMid, hip + gap, thigh + gap - 2);
  const upper = l(11, 17);
  const fore = l(9.5, 14);
  const wrist = l(7.5, 9.5);
  const hand = l(9, 11);
  return [
    // head
    [7, 1], [12, 5], [14.5, 12], [14.5 + f, 22], [13 + 1.5 * f, 31], [9.5 + 2 * f, 38], [7 + 2 * f, 43],
    // neck and sloping shoulder
    [7.5 + 2.5 * f, 47], [13 + 5 * f, 52], [24 + 6 * f, 57], [31 + 6 * f, 61],
    // arm: outside edge down to the fingertips, inside edge back up to the armpit
    [inTop + upper + 1, 72], [inTop + upper, 96], [inMid + fore + 0.5, 122], [inLow + wrist + 1, 158],
    [inLow + hand, 172], [inLow + hand * 0.55, 190], [inLow - 0.5, 180], [inLow, 158], [inMid, 122], [inTop, 96], [inTop, 82],
    // torso side
    [chest, 88], [lowChest, 102], [waist, 118], [belly, 132], [hip, 150],
    // leg: outside down to the toes, inside back up
    [thigh, 166], [l(21, 34), 200], [l(14.5, 21), 238], [l(15, 22), 262], [l(11, 15), 288], [l(8, 10.5), 302],
    [l(10.5, 13), 312], [l(8, 9), 319], [2.5, 319], [3, 302], [4, 268], [3.5, 240], [Math.max(0.8, 3.5 - 3 * f), 200],
  ];
}

/** Closed Catmull-Rom curve through the points, as an SVG path. */
function smooth(pts: Pt[]): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n];
  const r = (p: Pt) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  let d = `M${r(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r(c1)} ${r(c2)} ${r(p2)}`;
  }
  return d + "Z";
}

/** Full outline (both halves) for a BMI, centred on x = 0. */
function silhouette(bmi: number): string {
  const f = fatness(bmi);
  const right = rightSide(f);
  const left = right.map(([x, y]) => [-x, y] as Pt).reverse();
  return smooth([[0, 0], ...right, [0, 168 + 4 * f], ...left]);
}

/** Deurenberg (1991): body fat % from BMI, age and sex. A rough, weight-only estimate. */
const bodyFat = (bmi: number, age: number, male: boolean) => 1.2 * bmi + 0.23 * age - (male ? 16.2 : 5.4);

// BMI ladder bands (WHO), drawn from 17 to 42
const LO = 17;
const HI = 42;
const BANDS = [
  { to: 18.5, label: "Under", cls: "bg-line" },
  { to: 25, label: "Healthy", cls: "bg-good/70" },
  { to: 30, label: "Overweight", cls: "bg-warn/70" },
  { to: 35, label: "Obese I", cls: "bg-bad/55" },
  { to: 40, label: "Obese II", cls: "bg-bad/75" },
  { to: HI, label: "Obese III", cls: "bg-bad" },
];
const pct = (bmi: number) => ((Math.min(HI, Math.max(LO, bmi)) - LO) / (HI - LO)) * 100;
const pos = (bmi: number) => `${pct(bmi)}%`;

/** Where each ladder label sits: "now" above the bar, the others below; Goal drops to a second row if it would overlap Start. */
function labelRows(start: number, goal: number): Record<string, "above" | "below" | "below2"> {
  const near = Math.abs(pct(start) - pct(goal)) < 12;
  return { now: "above", start: "below", goal: near ? "below2" : "below" };
}

const FIGURES = [
  { key: "start", x: 70 },
  { key: "now", x: 210 },
  { key: "goal", x: 350 },
] as const;

const FILL: Record<(typeof FIGURES)[number]["key"], React.SVGProps<SVGPathElement>> = {
  start: { fill: "var(--muted)", fillOpacity: 0.55 },
  now: { fill: "var(--brand)" },
  goal: { fill: "var(--good)", fillOpacity: 0.85 },
};

export function BodyProgress({
  heightCm, startWeight, currentWeight, goalWeight, age, male,
}: { heightCm: number; startWeight: number; currentWeight: number; goalWeight: number; age: number; male: boolean }) {
  const m2 = (heightCm / 100) ** 2;
  const rows = [
    { key: "start", label: "Start", weight: startWeight },
    { key: "now", label: "Now", weight: currentWeight },
    { key: "goal", label: "Goal", weight: goalWeight },
  ].map((r) => ({ ...r, bmi: r.weight / m2, fat: bodyFat(r.weight / m2, age, male) }));
  const [start, now, goal] = rows;
  const labelRow = labelRows(start.bmi, goal.bmi);

  return (
    <section className="card">
      <div className="mb-4">
        <h2 className="font-bold">Body progress</h2>
        <p className="text-xs text-muted">
          Where you started, where you are and where you&apos;re heading, drawn from your weight. An illustration, not a photo.
        </p>
      </div>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
        <svg
          viewBox="0 -8 420 356"
          className="mx-auto h-auto w-full max-w-sm"
          role="img"
          aria-label={`Figures: start ${fmt(start.weight, 1)} kg, now ${fmt(now.weight, 1)} kg, goal ${fmt(goal.weight, 1)} kg`}
        >
          {FIGURES.map(({ key, x }) => {
            const r = rows.find((row) => row.key === key)!;
            return (
              <g key={key} transform={`translate(${x} 0)`}>
                <ellipse cx={0} cy={321} rx={34} ry={4} fill="var(--muted)" fillOpacity={0.18} />
                {/* where you started, faintly behind "now", so the lost part shows as a soft halo */}
                {key === "now" && <path d={silhouette(start.bmi)} fill="var(--muted)" fillOpacity={0.22} />}
                <path d={silhouette(r.bmi)} {...FILL[key]} />
                <text x={0} y={344} textAnchor="middle" fontSize={15} fontWeight={700} fill="currentColor">
                  {r.label}
                </text>
              </g>
            );
          })}
          {[140, 280].map((x) => (
            <text key={x} x={x} y={170} textAnchor="middle" fontSize={20} fill="var(--muted)">›</text>
          ))}
        </svg>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {rows.map((r) => (
              <div key={r.key}>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      r.key === "now" ? "bg-brand" : r.key === "start" ? "bg-muted/50" : "bg-good"
                    }`}
                  />
                  {r.label}
                </div>
                <div className="mt-0.5 text-lg font-bold tracking-tight">{fmt(r.weight, 1)} kg</div>
                <div className="text-xs text-muted">BMI {fmt(r.bmi, 1)} · {bmiCategory(r.bmi)}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-muted">BMI ladder</div>
            <div className={`relative pt-5 ${labelRow.goal === "below2" ? "pb-8" : "pb-5"}`}>
              <div className="flex h-2.5 overflow-hidden rounded-full">
                {BANDS.map((b, i) => (
                  <div key={b.label} className={b.cls} style={{ width: `${((b.to - (i ? BANDS[i - 1].to : LO)) / (HI - LO)) * 100}%` }} />
                ))}
              </div>
              {/* labels split above / below the bar so close markers don't collide (see labelRows) */}
              {rows.map((r) => (
                <div key={r.key} className="absolute top-5 -translate-x-1/2" style={{ left: pos(r.bmi) }}>
                  <div
                    className={`h-2.5 w-2.5 rounded-full border-2 ${
                      r.key === "now" ? "border-card bg-brand ring-2 ring-brand" : r.key === "start" ? "border-muted bg-card" : "border-good bg-card"
                    }`}
                  />
                  <div className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap ${{ above: "-top-5", below: "top-3.5", below2: "top-7" }[labelRow[r.key]]} ${r.key === "now" ? "text-brand" : "text-muted"}`}>
                    {r.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex text-[10px] text-muted">
              {BANDS.map((b, i) => (
                <div key={b.label} className="truncate text-center" style={{ width: `${((b.to - (i ? BANDS[i - 1].to : LO)) / (HI - LO)) * 100}%` }}>
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card-2 px-4 py-3">
            <div className="text-xs font-medium text-muted">Estimated body fat</div>
            <div className="mt-0.5 font-bold">
              {fmt(start.fat, 0)}% <span className="text-muted">→</span> {fmt(now.fat, 0)}%
              <span className="ml-2 text-sm font-medium text-muted">goal ~{fmt(goal.fat, 0)}%</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              From BMI and age only (Deurenberg formula), so it can be several points off and often reads low for South
              Asians. Watch the trend, not the exact number.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
