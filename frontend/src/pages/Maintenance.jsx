import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import { usePager, Pager } from '../components/Pagination';
import { IconWrench, IconTruck, IconWallet, IconPlus } from '../components/icons';

const EMPTY = { vehicleId: '', title: '', description: '', cost: '' };

export default function Maintenance() {
  const { user } = useAuth();
  const canWrite = user.role === 'FLEET_MANAGER';
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('OPEN');
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(null);
  const [closing, setClosing] = useState(null);

  async function load() {
    try {
      setLogs(await api.get('/maintenance'));
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter((m) => m.status === tab);
  const pager = usePager(filtered, 8);

  async function openCreate() {
    try {
      const all = await api.get('/vehicles');
      setVehicles(all.filter((v) => !['RETIRED', 'ON_TRIP', 'IN_SHOP'].includes(v.status)));
      setForm({ ...EMPTY });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      const log = await api.post('/maintenance', form);
      setForm(null);
      toast.success(`Maintenance opened — ${log.vehicle.name} is now In Shop and hidden from dispatch.`);
      load();
    } catch (err) {
      toast.error(err.message); // e.g. "vehicle is on a trip — complete or cancel the trip first"
    }
  }

  async function close(e) {
    e.preventDefault();
    try {
      const cost = Number(new FormData(e.target).get('cost'));
      const log = await api.post(`/maintenance/${closing.id}/close`, { cost });
      setClosing(null);
      toast.success(`Maintenance closed — ${log.vehicle.name} is Available again.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // MTD service costs (real data)
  const now = new Date();
  const mtdCost = logs
    .filter((m) => new Date(m.openedAt).getMonth() === now.getMonth() && new Date(m.openedAt).getFullYear() === now.getFullYear())
    .reduce((s, m) => s + Number(m.cost), 0);
  const openCount = logs.filter((m) => m.status === 'OPEN').length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Maintenance Overview</h1>
          <p className="page-sub">Monitor fleet health, track repairs, and manage service costs.</p>
        </div>
        {canWrite && (
          <button className="btn btn-dark" onClick={openCreate}>
            <IconPlus size={15} /> Log New Maintenance
          </button>
        )}
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon={<IconTruck />} tone="red" label="Vehicles In Shop" value={openCount}
          trend={{ dir: openCount > 0 ? 'up' : 'flat', text: `${openCount} open`, good: openCount === 0 }}
          sub="Automatically hidden from dispatch"
        />
        <KpiCard icon={<IconWrench />} tone="blue" label="Total Service Records" value={logs.length} sub={`${logs.length - openCount} closed`} />
        <KpiCard icon={<IconWallet />} tone="green" label="MTD Service Costs" value={`₹${mtdCost.toLocaleString()}`} sub="Logs opened this month" />
      </div>

      <div className="panel">
        <div className="tabs">
          <button className={`tab ${tab === 'OPEN' ? 'active' : ''}`} onClick={() => setTab('OPEN')}>
            Active Requests ({logs.filter((m) => m.status === 'OPEN').length})
          </button>
          <button className={`tab ${tab === 'CLOSED' ? 'active' : ''}`} onClick={() => setTab('CLOSED')}>
            Service History ({logs.filter((m) => m.status === 'CLOSED').length})
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th><th>Service Type</th><th>Cost</th>
                <th>Opened</th><th>Closed</th><th>Status</th>
                {canWrite && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="cell-avatar">
                      <div className="mini-avatar"><IconTruck size={15} /></div>
                      <div>
                        <strong>{m.vehicle.regNo}</strong>
                        <div className="muted small">{m.vehicle.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{m.title}</strong>
                    {m.description && <div className="muted small">{m.description}</div>}
                  </td>
                  <td className="mono">₹{Number(m.cost).toLocaleString()}</td>
                  <td className="muted">{new Date(m.openedAt).toLocaleDateString()}</td>
                  <td className="muted">{m.closedAt ? new Date(m.closedAt).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge badge-${m.status.toLowerCase()}`}>{m.status === 'OPEN' ? 'In Progress' : 'Completed'}</span></td>
                  {canWrite && (
                    <td className="row-actions">
                      {m.status === 'OPEN' && (
                        <button className="btn btn-blue btn-sm" onClick={() => setClosing(m)}>Close</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="muted center">No {tab === 'OPEN' ? 'active requests' : 'service history'} yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>Log New Maintenance</h2>
            <p className="muted small">Opening a log automatically moves the vehicle to <strong>In Shop</strong> and removes it from trip dispatch.</p>
            <div className="form-grid">
              <label>Vehicle
                <select value={form.vehicleId} onChange={set('vehicleId')} required>
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.regNo})</option>
                  ))}
                </select>
              </label>
              <label>Service Type<input value={form.title} onChange={set('title')} placeholder="Oil Change" required /></label>
              <label>Estimated Cost<input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} /></label>
              <label>Description<input value={form.description} onChange={set('description')} placeholder="Optional details" /></label>
            </div>
            {vehicles.length === 0 && <p className="alert alert-error" style={{ marginTop: 14 }}>No vehicles are eligible (must not be On Trip, In Shop, or Retired).</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-dark">Open &amp; Move to In Shop</button>
            </div>
          </form>
        </div>
      )}

      {closing && (
        <div className="modal-backdrop" onClick={() => setClosing(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={close}>
            <h2>Close Maintenance</h2>
            <p className="muted small">
              {closing.title} on {closing.vehicle.name} — the vehicle returns to <strong>Available</strong> (unless retired).
            </p>
            <label>Final Cost
              <input name="cost" type="number" min="0" step="0.01" defaultValue={Number(closing.cost)} autoFocus />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setClosing(null)}>Cancel</button>
              <button className="btn btn-dark">Close Log</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
