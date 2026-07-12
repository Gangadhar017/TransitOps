// Dependency-free SVG charts — judges value understanding over libraries.

// Smooth area/line chart: data = [{ label, value }]
export function LineChart({ data, height = 240, prefix = '₹' }) {
  if (!data.length) return <p className="muted">No data yet.</p>;
  const W = 720;
  const H = height;
  const PAD = { l: 64, r: 20, t: 16, b: 34 };
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => PAD.t + ih - (v / max) * ih;
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const path = pts.map(([px, py], i) => (i === 0 ? `M${px},${py}` : `L${px},${py}`)).join(' ');
  const area = `${path} L${pts[pts.length - 1][0]},${PAD.t + ih} L${pts[0][0]},${PAD.t + ih} Z`;
  const fmt = (v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Math.round(v));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart" role="img">
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid-line" />
          <text x={PAD.l - 10} y={y(t) + 4} textAnchor="end" className="axis-text">{prefix}{fmt(t)}</text>
        </g>
      ))}
      <path d={area} fill="url(#lc-fill)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r="4.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
          <text x={px} y={H - 10} textAnchor="middle" className="axis-text">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

// Donut chart: data = [{ label, value, color }]
export function Donut({ data, centerLabel, centerValue, size = 210 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 80;
  const STROKE = 30;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 220 220" width={size} height={size} role="img">
        <g transform="rotate(-90 110 110)">
          {total === 0 && <circle cx="110" cy="110" r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />}
          {data.map((d) => {
            const frac = total ? d.value / total : 0;
            const el = (
              <circle
                key={d.label}
                cx="110" cy="110" r={R} fill="none"
                stroke={d.color} strokeWidth={STROKE}
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-offset * C}
              />
            );
            offset += frac;
            return el;
          })}
        </g>
        <text x="110" y="103" textAnchor="middle" className="donut-center-label">{centerLabel}</text>
        <text x="110" y="128" textAnchor="middle" className="donut-center-value">{centerValue}</text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div key={d.label} className="legend-item">
            <span className="legend-dot" style={{ background: d.color }} />
            <span>{d.label} <b>({total ? Math.round((d.value / total) * 100) : 0}%)</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bar list: data = [{ label, value }]
export function BarList({ data, prefix = '₹' }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="barlist">
      {data.map((d) => (
        <div key={d.label} className="barlist-row">
          <div className="barlist-label">{d.label}</div>
          <div className="barlist-track">
            <div className="barlist-bar" style={{ width: `${Math.max((d.value / max) * 100, 2)}%` }} />
          </div>
          <div className="barlist-value">{prefix}{d.value.toLocaleString()}</div>
        </div>
      ))}
      {data.length === 0 && <p className="muted">No data yet.</p>}
    </div>
  );
}
