/**
 * Davidovici Expenses — chart library (server-safe SVG).
 * Donut, AreaChart, Bars, HBars, Sparkline. Ported from the Nocturne prototype.
 * Theme-driven via CSS vars; no hooks, so usable in RSC and client screens.
 */

type Fmt = (v: number) => string;

// ───────────────────────────── Donut ─────────────────────────────

export interface DonutDatum {
  label: string;
  amount: number;
  color: string;
}

export function Donut({
  data,
  size = 220,
  thickness = 26,
  centerTop,
  centerMain,
  centerSub,
  fmt,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
  fmt?: Fmt;
}) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--glass-3)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = d.amount / total;
        const len = frac * circ;
        const el = (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition: "stroke-dasharray 600ms var(--ease-out-expo)" }}
          >
            <title>{`${d.label}: ${fmt ? fmt(d.amount) : d.amount}`}</title>
          </circle>
        );
        offset += len;
        return el;
      })}
      {centerTop && (
        <text
          x={c}
          y={c - 14}
          textAnchor="middle"
          style={{ fill: "var(--fg-3)", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, letterSpacing: "0.04em" }}
        >
          {centerTop}
        </text>
      )}
      {centerMain && (
        <text x={c} y={c + 9} textAnchor="middle" style={{ fill: "var(--fg-0)", fontSize: 23, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
          {centerMain}
        </text>
      )}
      {centerSub && (
        <text x={c} y={c + 28} textAnchor="middle" style={{ fill: "var(--fg-3)", fontSize: 11, fontFamily: "var(--font-sans)" }}>
          {centerSub}
        </text>
      )}
    </svg>
  );
}

// ───────────────────────────── AreaChart ─────────────────────────────

export interface Point {
  label: string;
  value: number;
}

export function AreaChart({
  points,
  height = 220,
  color = "var(--accent-400)",
  id = "a",
  showDots = true,
  valueFmt,
}: {
  points: Point[];
  height?: number;
  color?: string;
  id?: string;
  showDots?: boolean;
  valueFmt?: Fmt;
}) {
  const W = 640;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 26;
  const max = Math.max(...points.map((p) => p.value), 1);
  const niceMax = max * 1.18;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xs = points.map((_, i) => padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW));
  const ys = points.map((p) => padT + innerH - (p.value / niceMax) * innerH);
  const path = xs
    .map((x, i) => {
      if (i === 0) return `M ${x} ${ys[i]}`;
      const x0 = xs[i - 1];
      const y0 = ys[i - 1];
      const x1 = x;
      const y1 = ys[i];
      const cx = (x0 + x1) / 2;
      return `C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    })
    .join(" ");
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + innerH - f * innerH);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.30" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridYs.map((y, i) => (
        <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
      ))}
      <path d={`${path} L ${xs[xs.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`} fill={`url(#area-${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {showDots &&
        xs.map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={ys[i]} r="3.5" fill="var(--bg-0)" stroke={color} strokeWidth="2" />
            <title>{`${points[i].label}: ${valueFmt ? valueFmt(points[i].value) : points[i].value}`}</title>
          </g>
        ))}
      {points.map((p, i) => (
        <text key={i} x={xs[i]} y={H - 8} textAnchor="middle" style={{ fill: "var(--fg-4)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ───────────────────────────── Bars ─────────────────────────────

export interface BarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export function Bars({
  data,
  height = 220,
  color = "var(--accent-400)",
  valueFmt,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  valueFmt?: Fmt;
}) {
  const W = 640;
  const H = height;
  const padT = 22;
  const padB = 26;
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const innerH = H - padT - padB;
  const n = data.length || 1;
  const slot = W / n;
  const bw = Math.min(54, slot * 0.5);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1="0" x2={W} y1={padT + innerH - f * innerH} y2={padT + innerH - f * innerH} stroke="var(--border-subtle)" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = slot * i + slot / 2 - bw / 2;
        const y = padT + innerH - h;
        const fill = d.highlight ? color : `color-mix(in oklab, ${color} 38%, transparent)`;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={Math.max(h, 2)} rx="6" fill={fill} style={{ transition: "all 500ms var(--ease-out-expo)" }}>
              <title>{`${d.label}: ${valueFmt ? valueFmt(d.value) : d.value}`}</title>
            </rect>
            <text x={slot * i + slot / 2} y={y - 7} textAnchor="middle" style={{ fill: d.highlight ? "var(--fg-0)" : "var(--fg-3)", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {valueFmt ? valueFmt(d.value) : d.value}
            </text>
            <text x={slot * i + slot / 2} y={H - 8} textAnchor="middle" style={{ fill: "var(--fg-4)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ───────────────────────────── HBars ─────────────────────────────

export interface HBarDatum {
  label: string;
  value: number;
  color?: string;
  count?: number;
  dot?: boolean;
}

export function HBars({
  data,
  max,
  valueFmt,
  showCount,
}: {
  data: HBarDatum[];
  max?: number;
  valueFmt?: Fmt;
  showCount?: boolean;
}) {
  const top = max || Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-1)", fontWeight: 500, minWidth: 0 }}>
              {d.dot && <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, flexShrink: 0 }} />}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {showCount && d.count !== undefined && (
                <span style={{ color: "var(--fg-4)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{d.count} פעולות</span>
              )}
              <span className="num" style={{ color: "var(--fg-0)", fontWeight: 600 }}>
                {valueFmt ? valueFmt(d.value) : d.value}
              </span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--glass-3)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(d.value / top) * 100}%`,
                borderRadius: 999,
                background: d.color || "var(--accent-400)",
                transition: "width 600ms var(--ease-out-expo)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────── Sparkline ─────────────────────────────

export function Sparkline({
  data = [],
  color = "var(--accent-400)",
  width = 120,
  height = 34,
  id = "s",
}: {
  data?: number[];
  color?: string;
  width?: number;
  height?: number;
  id?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - ((v - min) / range) * (height - 6) - 3]);
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#sp-${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
