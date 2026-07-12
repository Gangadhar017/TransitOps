import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import KpiCard from '../components/KpiCard';
import { LineChart, Donut, BarList } from '../components/charts';
import { IconFuel, IconTrend, IconWallet, IconDownload } from '../components/icons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports() {
  const [report, setReport] = useState([]);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/reports/vehicles'), api.get('/trips?status=COMPLETED')])
      .then(([r, t]) => {
        setReport(r);
        setTrips(t);
      })
      .catch((err) => toast.error(err.message));
  }, []);

  async function downloadCsv() {
    const token = localStorage.getItem('transitops_token');
    const res = await fetch('/api/reports/vehicles?format=csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transitops-vehicle-report.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Fleet-level aggregates (real data)
  const totDistance = report.reduce((s, r) => s + r.distanceKm, 0);
  const totLiters = report.reduce((s, r) => s + r.fuelLiters, 0);
  const totFuelCost = report.reduce((s, r) => s + r.fuelCost, 0);
  const totMaint = report.reduce((s, r) => s + r.maintenanceCost, 0);
  const totOther = report.reduce((s, r) => s + r.otherExpenses, 0);
  const totRevenue = report.reduce((s, r) => s + r.revenue, 0);
  const avgEff = totLiters > 0 ? (totDistance / totLiters).toFixed(1) : '—';
  const costPerKm = totDistance > 0 ? ((totFuelCost + totMaint) / totDistance).toFixed(2) : '—';

  // Revenue by month (last 6 months) from completed trips
  const now = new Date();
  const revenueSeries = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const value = trips
      .filter((t) => t.completedAt && new Date(t.completedAt).getMonth() === d.getMonth() && new Date(t.completedAt).getFullYear() === d.getFullYear())
      .reduce((s, t) => s + Number(t.revenue), 0);
    return { label: MONTHS[d.getMonth()], value };
  });

  const donutData = [
    { label: 'Fuel', value: totFuelCost, color: '#2563eb' },
    { label: 'Maintenance', value: totMaint, color: '#f59e0b' },
    { label: 'Tolls & Other', value: totOther, color: '#10b981' },
  ];
  const totalCost = totFuelCost + totMaint + totOther;
  const fmtCr = (n) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(1)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(1)} L` : `₹${Math.round(n).toLocaleString()}`);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p className="page-sub">Fleet performance and financial overview.</p>
        </div>
        <button className="btn btn-dark" onClick={downloadCsv}>
          <IconDownload size={15} /> Export CSV
        </button>
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon={<IconFuel />} tone="blue" label="Avg Fuel Efficiency"
          value={<>{avgEff}<small> km/L</small></>}
          trend={{ dir: 'up', text: `${totLiters.toLocaleString()} L`, good: true }}
          sub={`${totDistance.toLocaleString()} km on completed trips`}
        />
        <KpiCard
          icon={<IconTrend />} tone="amber" label="Operating Cost per km"
          value={<>₹{costPerKm}</>}
          trend={{ dir: 'down', text: 'fuel + maint.', good: true }}
          sub={`₹${(totFuelCost + totMaint).toLocaleString()} total operational cost`}
        />
        <KpiCard
          icon={<IconWallet />} tone="green" label="Total Revenue"
          value={fmtCr(totRevenue)}
          trend={{ dir: 'up', text: `${trips.length} trips`, good: true }}
          sub="From completed trips"
        />
      </div>

      <div className="chart-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Revenue Trends</h2>
              <div className="muted small">Last 6 months performance</div>
            </div>
          </div>
          <div className="panel-body">
            <LineChart data={revenueSeries} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Cost Distribution</h2>
              <div className="muted small">All-time breakdown</div>
            </div>
          </div>
          <div className="panel-body">
            <Donut data={donutData} centerLabel="Total Cost" centerValue={fmtCr(totalCost)} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Operational Cost per Vehicle</h2>
            <div className="muted small">Fuel + maintenance, ranked</div>
          </div>
        </div>
        <div className="panel-body">
          <BarList data={[...report].sort((a, b) => b.operationalCost - a.operationalCost).map((r) => ({ label: r.name, value: r.operationalCost }))} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Vehicle Performance</h2>
            <div className="muted small">Efficiency = distance ÷ liters · Operational cost = fuel + maintenance · ROI = (revenue − operational cost) ÷ acquisition cost</div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th><th>Trips</th><th>Distance (km)</th><th>Fuel (L)</th>
                <th>Efficiency (km/L)</th><th>Fuel Cost</th><th>Maintenance</th>
                <th>Operational Cost</th><th>Revenue</th><th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.vehicleId}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted small mono">{r.regNo}</div>
                  </td>
                  <td>{r.completedTrips}</td>
                  <td className="mono">{r.distanceKm.toLocaleString()}</td>
                  <td className="mono">{r.fuelLiters.toLocaleString()}</td>
                  <td className="mono">{r.fuelEfficiencyKmPerL ?? '—'}</td>
                  <td className="mono">₹{r.fuelCost.toLocaleString()}</td>
                  <td className="mono">₹{r.maintenanceCost.toLocaleString()}</td>
                  <td className="mono"><strong>₹{r.operationalCost.toLocaleString()}</strong></td>
                  <td className="mono">₹{r.revenue.toLocaleString()}</td>
                  <td>
                    {r.roi === null ? '—' : (
                      <span className={`chip ${r.roi >= 0 ? 'chip-green' : 'chip-red'}`}>
                        {r.roi >= 0 ? '↗' : '↘'} {(r.roi * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
