import { money } from "@/lib/format";

const BLUE = "#3b82f6";
const RED = "#ef4444";
const W = 900;
const H = 150;
const PAD = { l: 44, r: 14, t: 10, b: 22 };

const compact = new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 });

/** Nice upper bound for the y axis (1, 2, 2.5, 5 × 10^n). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/**
 * Acumulado del mes: cuánto se fue cobrando (azul) y cuánto se fue gastando (rojo), día a día.
 * `upTo` es el último día con datos (hoy si es el mes en curso); después de eso las líneas no continúan.
 */
export default function FlowChart({
  month, upTo, cur, income, spend,
}: {
  month: string;
  upTo: number;
  cur: string;
  income: [date: string, amount: number][];
  spend: [date: string, amount: number][];
}) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = Math.min(Math.max(upTo, 1), days);

  const series = (rows: [string, number][]) => {
    const perDay = Array<number>(days + 1).fill(0);
    for (const [d, a] of rows) perDay[Number(d.slice(8, 10))] += Number(a);
    let acc = 0;
    return Array.from({ length: last }, (_, i) => (acc += perDay[i + 1]));
  };
  const inc = series(income);
  const exp = series(spend);
  const empty = (inc[last - 1] ?? 0) === 0 && (exp[last - 1] ?? 0) === 0;
  // Sin movimientos se dibuja solo el marco (ejes y cuadrícula) con una escala de referencia.
  const top = empty ? 100 : niceMax(Math.max(inc[last - 1] ?? 0, exp[last - 1] ?? 0));

  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;
  const x = (day: number) => PAD.l + (days === 1 ? 0 : ((day - 1) / (days - 1)) * pw);
  const yv = (v: number) => PAD.t + ph - (v / top) * ph;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${yv(v).toFixed(1)}`).join(" ");
  const ticks = [0, top / 2, top];
  const xTicks = [1, Math.round((days + 1) / 2), days];
  const colW = pw / Math.max(days - 1, 1);

  const end = (vals: number[], color: string, label: string, dy: number) => {
    const v = vals[last - 1];
    const cx = x(last);
    const cy = yv(v);
    const anchor = cx > W - 110 ? "end" : "start";
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--background)" strokeWidth={2} />
        <text x={anchor === "end" ? cx - 8 : cx + 8} y={cy + dy} textAnchor={anchor} fontSize={11.5} fontWeight={600} fill="var(--text-2)">
          {label} {money(v, cur)}
        </text>
      </g>
    );
  };

  // Si las dos líneas terminan casi al mismo nivel, las etiquetas se separan para no pisarse.
  const gap = Math.abs(yv(inc[last - 1]) - yv(exp[last - 1])) < 16;
  const incAbove = yv(inc[last - 1]) <= yv(exp[last - 1]);

  return (
    <div>
      <div style={{ display: "flex", gap: 18, fontSize: 13, color: "var(--text-2)", marginBottom: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i style={{ width: 14, height: 3, borderRadius: 2, background: BLUE, display: "inline-block" }} /> Cobrado
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i style={{ width: 14, height: 3, borderRadius: 2, background: RED, display: "inline-block" }} /> Gastos
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cobros y gastos acumulados del mes en ${cur}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yv(t)} y2={yv(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 8} y={yv(t) + 4} textAnchor="end" fontSize={11} fill="var(--text-2)">{compact.format(t)}</text>
          </g>
        ))}
        {xTicks.map((d, i) => (
          <text key={d} x={x(d)} y={H - 6} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--text-2)">
            {d}
          </text>
        ))}

        {empty ? (
          <text x={PAD.l + pw / 2} y={PAD.t + ph / 2 + 4} textAnchor="middle" fontSize={13} fill="var(--text-2)">
            Sin cobros ni gastos este mes
          </text>
        ) : (
          <>
            <path d={path(exp)} fill="none" stroke={RED} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={path(inc)} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {end(inc, BLUE, "Cobrado", gap ? (incAbove ? -9 : 15) : 4)}
            {end(exp, RED, "Gastos", gap ? (incAbove ? 15 : -9) : 4)}
          </>
        )}

        {/* Zonas de hover: una por día, con el detalle acumulado en el tooltip nativo. */}
        {!empty && Array.from({ length: last }, (_, i) => (
          <rect key={i} x={x(i + 1) - colW / 2} y={PAD.t} width={colW} height={ph} fill="transparent">
            <title>{`Día ${i + 1} · Cobrado ${money(inc[i], cur)} · Gastos ${money(exp[i], cur)}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}
