// Reference-style KPI card: tinted icon square, trend chip, mono label, big value.
// tone: blue | green | amber | red | purple  ·  trend: { dir: 'up'|'down'|'flat', text, good }
export default function KpiCard({ icon, tone = 'blue', label, value, sub, trend, dark }) {
  return (
    <div className={`kpi-card ${dark ? 'kpi-dark' : ''}`}>
      <div className="kpi-top">
        <div className={`kpi-ico tone-${tone}`}>{icon}</div>
        {trend && (
          <span className={`chip ${trend.good === false ? 'chip-red' : trend.good ? 'chip-green' : 'chip-gray'}`}>
            {trend.dir === 'up' ? '↗' : trend.dir === 'down' ? '↘' : '—'} {trend.text}
          </span>
        )}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
