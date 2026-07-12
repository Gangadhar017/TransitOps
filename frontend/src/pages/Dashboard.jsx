import { useEffect, useState } from 'react';
import { api } from '../api/client';

const KPI_CARDS = [
  { key: 'availableVehicles', label: 'Available Vehicles', tone: 'green' },
  { key: 'activeVehicles', label: 'Vehicles On Trip', tone: 'blue' },
  { key: 'inMaintenance', label: 'In Maintenance', tone: 'amber' },
  { key: 'activeTrips', label: 'Active Trips', tone: 'blue' },
  { key: 'pendingTrips', label: 'Pending Trips (Draft)', tone: 'gray' },
  { key: 'driversOnDuty', label: 'Drivers On Duty', tone: 'green' },
];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [type, setType] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (region) params.set('region', region);
    api
      .get(`/dashboard?${params}`)
      .then(setKpis)
      .catch((err) => setError(err.message));
  }, [type, region]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!kpis) return <p className="muted">Loading dashboard…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <div className="filters">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option>Truck</option>
            <option>Mini Truck</option>
            <option>Van</option>
            <option>Bike</option>
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            <option>North</option>
            <option>South</option>
            <option>East</option>
            <option>West</option>
            <option>Central</option>
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        {KPI_CARDS.map((c) => (
          <div key={c.key} className={`kpi-card tone-${c.tone}`}>
            <div className="kpi-value">{kpis[c.key]}</div>
            <div className="kpi-label">{c.label}</div>
          </div>
        ))}
        <div className="kpi-card tone-purple kpi-wide">
          <div className="kpi-value">{kpis.fleetUtilization}%</div>
          <div className="kpi-label">Fleet Utilization (on-trip ÷ active fleet)</div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${Math.min(kpis.fleetUtilization, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
