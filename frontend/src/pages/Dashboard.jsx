import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import { IconRoute, IconUser, IconWrench, IconWallet, IconAlert, IconTruck, IconCalendar } from '../components/icons';

const fmtMoney = (n) => `₹${Math.round(n).toLocaleString()}`;
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

export default function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [openMaint, setOpenMaint] = useState([]);
  const [type, setType] = useState('');
  const [region, setRegion] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (region) params.set('region', region);
    Promise.all([
      api.get(`/dashboard?${params}`),
      api.get('/trips'),
      api.get('/drivers'),
      api.get('/maintenance?status=OPEN'),
    ])
      .then(([k, t, d, m]) => {
        setKpis(k);
        setTrips(t);
        setDrivers(d);
        setOpenMaint(m);
      })
      .catch((err) => toast.error(err.message));
  }, [type, region]);

  if (!kpis) return <p className="muted">Loading dashboard…</p>;

  // Revenue MTD from completed trips this month (real data)
  const now = new Date();
  const revenueMtd = trips
    .filter((t) => t.status === 'COMPLETED' && t.completedAt && new Date(t.completedAt).getMonth() === now.getMonth() && new Date(t.completedAt).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + Number(t.revenue), 0);

  // Critical alerts built from live data
  const alerts = [
    ...drivers
      .filter((d) => new Date(d.licenseExpiry) < now)
      .map((d) => ({ tone: 'red', icon: <IconAlert size={17} />, title: 'License Expired', desc: `${d.name}'s license (${d.licenseNo}) expired on ${new Date(d.licenseExpiry).toLocaleDateString()}.`, tag: 'Blocked from dispatch' })),
    ...drivers
      .filter((d) => { const dd = daysUntil(d.licenseExpiry); return dd >= 0 && dd <= 30; })
      .map((d) => ({ tone: 'amber', icon: <IconCalendar size={17} />, title: 'License Expiring Soon', desc: `${d.name}'s license expires in ${daysUntil(d.licenseExpiry)} days.`, tag: 'Renewal required' })),
    ...drivers
      .filter((d) => d.status === 'SUSPENDED')
      .map((d) => ({ tone: 'red', icon: <IconUser size={17} />, title: 'Driver Suspended', desc: `${d.name} is suspended (safety score ${d.safetyScore}).`, tag: 'Safety review' })),
    ...openMaint.map((m) => ({ tone: 'amber', icon: <IconWrench size={17} />, title: 'Vehicle In Shop', desc: `${m.vehicle.name} (${m.vehicle.regNo}) — ${m.title}.`, tag: 'Hidden from dispatch' })),
    ...trips
      .filter((t) => t.status === 'DRAFT')
      .map((t) => ({ tone: 'blue', icon: <IconRoute size={17} />, title: 'Trip Awaiting Dispatch', desc: `#${t.id} ${t.source} → ${t.destination} (${Number(t.cargoWeightKg).toLocaleString()} kg).`, tag: 'Draft' })),
  ];

  const active = trips.filter((t) => t.status === 'DISPATCHED');
  const statusRows = [
    { label: 'Available', value: kpis.availableVehicles, cls: 'score-green' },
    { label: 'On Trip', value: kpis.activeVehicles, cls: 'score-green' },
    { label: 'In Shop', value: kpis.inMaintenance, cls: 'score-amber' },
    { label: 'Retired', value: kpis.retiredVehicles, cls: 'score-red' },
  ];
  const maxStatus = Math.max(...statusRows.map((r) => r.value), 1);
  const dutyPct = kpis.totalDrivers ? Math.round((kpis.driversOnDuty / kpis.totalDrivers) * 100) : 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="page-sub">Real-time operational metrics for the fleet ecosystem.</p>
        </div>
        <div className="filters">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option>Truck</option><option>Mini Truck</option><option>Van</option><option>Bike</option>
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">All regions</option>
            <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
          </select>
        </div>
      </div>

      <div className="kpi-grid">
        {(() => {
          // RBAC matrix: each role leads with its own KPI lens
          // FM = fleet, DRIVER = trips, SO = compliance (drivers), FA = financial
          const CARDS = {
            trips: (
              <KpiCard key="trips"
                icon={<IconRoute />} tone="blue" label="Active Trips" value={kpis.activeTrips}
                trend={{ dir: 'up', text: `${kpis.pendingTrips} pending`, good: true }}
                sub={`${kpis.pendingTrips} draft trip${kpis.pendingTrips === 1 ? '' : 's'} awaiting dispatch`}
              />
            ),
            drivers: (
              <KpiCard key="drivers"
                icon={<IconUser />} tone="green" label="Drivers On Duty"
                value={<>{kpis.driversOnDuty}<small> / {kpis.totalDrivers}</small></>}
                trend={{ dir: dutyPct >= 50 ? 'up' : 'down', text: `${dutyPct}% duty`, good: dutyPct >= 50 }}
                sub="Available + currently on trip"
              />
            ),
            shop: (
              <KpiCard key="shop"
                icon={<IconWrench />} tone={kpis.inMaintenance > 0 ? 'red' : 'green'} label="Vehicles In Shop" value={kpis.inMaintenance}
                trend={{ dir: kpis.inMaintenance > 0 ? 'up' : 'flat', text: `${openMaint.length} open job${openMaint.length === 1 ? '' : 's'}`, good: kpis.inMaintenance === 0 }}
                sub={`${kpis.availableVehicles} vehicles ready for dispatch`}
              />
            ),
            revenue: (
              <KpiCard key="revenue"
                dark icon={<IconWallet />} tone="blue" label="Revenue MTD" value={fmtMoney(revenueMtd)}
                trend={{ dir: 'up', text: `${kpis.fleetUtilization}% util`, good: true }}
                sub={`Fleet utilization ${kpis.fleetUtilization}% of active fleet`}
              />
            ),
          };
          const ORDER = {
            FLEET_MANAGER: ['shop', 'trips', 'drivers', 'revenue'],
            DRIVER: ['trips', 'drivers', 'shop', 'revenue'],
            SAFETY_OFFICER: ['drivers', 'trips', 'shop', 'revenue'],
            FINANCIAL_ANALYST: ['revenue', 'trips', 'shop', 'drivers'],
          };
          return (ORDER[user.role] || ORDER.DRIVER).map((k) => CARDS[k]);
        })()}
      </div>

      <div className="chart-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Fleet Status Distribution</h2>
              <div className="muted small">Live vehicle counts by lifecycle status</div>
            </div>
            <span className="chip chip-blue">{kpis.totalVehicles} total</span>
          </div>
          <div className="panel-body">
            <div className="barlist">
              {statusRows.map((r) => (
                <div key={r.label} className="barlist-row">
                  <div className="barlist-label">{r.label}</div>
                  <div className="barlist-track">
                    <div className={`barlist-bar`} style={{ width: `${Math.max((r.value / maxStatus) * 100, 2)}%` }} />
                  </div>
                  <div className="barlist-value">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Critical Alerts</h2>
            {alerts.length > 0 && <span className="chip chip-red">{alerts.length} active</span>}
          </div>
          <div className="panel-body" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {alerts.length === 0 && <p className="muted">All clear — no compliance or maintenance alerts. ✓</p>}
            {alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <div className={`alert-ico tone-${a.tone}`}>{a.icon}</div>
                <div>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-desc">{a.desc}</div>
                  <span className="alert-tag">{a.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Live Tracking</h2>
            <div className="muted small">Trips currently on the road</div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Trip ID</th><th>Vehicle / Driver</th><th>Route</th><th>Cargo</th><th>Status</th><th>Dispatched</th></tr>
            </thead>
            <tbody>
              {active.map((t) => (
                <tr key={t.id}>
                  <td className="mono">#{t.id}</td>
                  <td>
                    <div className="cell-avatar">
                      <div className="mini-avatar"><IconTruck size={15} /></div>
                      <div>
                        <strong>{t.vehicle.regNo}</strong>
                        <div className="muted small">{t.driver.name}</div>
                      </div>
                    </div>
                  </td>
                  <td><strong>{t.source}</strong> → <strong>{t.destination}</strong></td>
                  <td>{Number(t.cargoWeightKg).toLocaleString()} kg</td>
                  <td><span className="badge badge-dispatched">On Route</span></td>
                  <td className="muted">{t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr><td colSpan="6" className="muted center">No trips on the road right now — dispatch one from Trips.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
