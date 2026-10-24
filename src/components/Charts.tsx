"use client";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, Tooltip, XAxis, YAxis,
} from "recharts";

type Day = {
  date: string; weight: number | null; goal: number | null; intake: number | null;
  burn: number; protein: number | null; steps: number | null; km: number | null;
};

// Validated pair (dataviz validator, light + dark): series 1 blue, series 2 orange.
const S1 = "var(--chart-1)";
const S2 = "var(--chart-2)";
const size = { responsive: true, style: { width: "100%", height: 240 } } as const;
const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const grid = <CartesianGrid stroke="var(--line)" strokeDasharray="0" vertical={false} />;
const tip = {
  cursor: { fill: "var(--card-2)", stroke: "var(--line)" },
  contentStyle: {
    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10,
    color: "var(--foreground)", fontSize: 12, boxShadow: "var(--shadow)",
  },
  labelStyle: { fontWeight: 700, marginBottom: 2 },
};
const legend = <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />;
const target = (y: number) => <ReferenceLine y={y} stroke="var(--muted)" strokeDasharray="4 4" strokeOpacity={0.8} />;

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="mb-3">
        <h2 className="font-bold">{title}</h2>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export function Charts({
  days, kcalTarget, proteinTarget, stepTarget,
}: { days: Day[]; kcalTarget: number; proteinTarget: number; stepTarget: number }) {
  const last14 = days.slice(-14);
  const weights = days.flatMap((d) => [d.weight, d.goal]).filter((v): v is number => v != null);
  const lo = Math.floor(Math.min(...weights) - 1);
  const hi = Math.ceil(Math.max(...weights) + 0.5);
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <Panel title="Weight trend" sub="Morning weigh-ins vs your goal plan (kg)">
        <ComposedChart {...size} data={days} margin={{ left: -18, right: 8, top: 8 }}>
          {grid}
          <XAxis dataKey="date" {...axis} />
          <YAxis domain={[lo, hi]} {...axis} />
          <Tooltip {...tip} />
          {legend}
          <Line isAnimationActive={false} name="Plan" dataKey="goal" stroke={S2} strokeWidth={2} strokeDasharray="6 5" dot={false} />
          <Line isAnimationActive={false} name="Weight" dataKey="weight" stroke={S1} strokeWidth={2} connectNulls
            dot={{ r: 4, fill: S1, stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }} />
        </ComposedChart>
      </Panel>

      <Panel title="Calories in vs out" sub={`Last 14 days (kcal) · dashed line = ${kcalTarget.toLocaleString()} target`}>
        <BarChart {...size} data={last14} margin={{ left: -10, right: 8, top: 8 }} barGap={2} barCategoryGap="22%">
          {grid}
          <XAxis dataKey="date" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          {legend}
          {target(kcalTarget)}
          <Bar isAnimationActive={false} name="Eaten" dataKey="intake" fill={S2} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar isAnimationActive={false} name="Burned" dataKey="burn" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </Panel>

      <Panel title="Protein" sub={`Grams per day · dashed line = ${proteinTarget} g target`}>
        <BarChart {...size} data={last14} margin={{ left: -18, right: 8, top: 8 }} barCategoryGap="30%">
          {grid}
          <XAxis dataKey="date" {...axis} />
          <YAxis {...axis} domain={[0, (max: number) => Math.max(max, proteinTarget) + 10]} />
          <Tooltip {...tip} />
          {target(proteinTarget)}
          <Bar isAnimationActive={false} name="Protein (g)" dataKey="protein" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </Panel>

      <Panel title="Steps" sub={`Daily steps and distance · dashed line = ${stepTarget.toLocaleString()} target`}>
        <BarChart {...size} data={last14} margin={{ left: -8, right: 8, top: 8 }} barCategoryGap="30%">
          {grid}
          <XAxis dataKey="date" {...axis} />
          <YAxis {...axis} domain={[0, (max: number) => Math.max(max, stepTarget) * 1.08]} tickFormatter={(v: number) => (v ? `${+(v / 1000).toFixed(1)}k` : "0")} allowDecimals={false} />
          <Tooltip
            {...tip}
            formatter={(v, _n, item) => [
              `${Number(v).toLocaleString()}${item.payload.km != null ? ` · ${item.payload.km} km` : ""}`,
              "Steps",
            ]}
          />
          {target(stepTarget)}
          <Bar isAnimationActive={false} name="Steps" dataKey="steps" fill={S1} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </Panel>
    </div>
  );
}
