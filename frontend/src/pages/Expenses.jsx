import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import { usePager, Pager } from '../components/Pagination';
import { IconFuel, IconWallet, IconTrend, IconPlus, IconTruck } from '../components/icons';

const FUEL_EMPTY = { vehicleId: '', liters: '', cost: '', filledAt: '' };
const EXP_EMPTY = { vehicleId: '', category: 'TOLL', amount: '', note: '' };

export default function Expenses() {
  const { user } = useAuth();
  // RBAC: Financial Analyst owns fuel & expenses; Fleet Manager has full access (Driver: no access)
  const canWrite = ['FINANCIAL_ANALYST', 'FLEET_MANAGER'].includes(user.role);
  const [tab, setTab] = useState('fuel');
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [form, setForm] = useState(null);

  async function load() {
    const q = vehicleFilter ? `?vehicleId=${vehicleFilter}` : '';
    try {
      const [f, e, v] = await Promise.all([api.get(`/fuel-logs${q}`), api.get(`/expenses${q}`), api.get('/vehicles')]);
      setFuelLogs(f);
      setExpenses(e);
      setVehicles(v);
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [vehicleFilter]);

  const fuelPager = usePager(fuelLogs, 8);
  const expPager = usePager(expenses, 8);
  const pager = tab === 'fuel' ? fuelPager : expPager;

  async function save(e) {
    e.preventDefault();
    try {
      if (form.kind === 'fuel') await api.post('/fuel-logs', form);
      else await api.post('/expenses', form);
      toast.success(form.kind === 'fuel' ? 'Fuel log recorded.' : 'Expense recorded.');
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const totalFuel = fuelLogs.reduce((s, f) => s + Number(f.cost), 0);
  const totalLiters = fuelLogs.reduce((s, f) => s + Number(f.liters), 0);
  const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Fuel &amp; Expenses</h1>
          <p className="page-sub">Record fuel fills, tolls, and other operating costs per vehicle.</p>
        </div>
        {canWrite && (
          <div className="filters">
            <button className="btn btn-ghost" onClick={() => setForm({ kind: 'expense', ...EXP_EMPTY, vehicleId: vehicleFilter })}>
              <IconPlus size={15} /> Add Expense
            </button>
            <button className="btn btn-dark" onClick={() => setForm({ kind: 'fuel', ...FUEL_EMPTY, vehicleId: vehicleFilter })}>
              <IconPlus size={15} /> Add Fuel Log
            </button>
          </div>
        )}
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon={<IconFuel />} tone="amber" label="Fuel Cost" value={`₹${totalFuel.toLocaleString()}`}
          sub={`${totalLiters.toLocaleString()} liters ${vehicleFilter ? '(this vehicle)' : '(all vehicles)'}`}
        />
        <KpiCard icon={<IconWallet />} tone="blue" label="Other Expenses" value={`₹${totalExpenses.toLocaleString()}`} sub="Tolls, parking, fines, misc" />
        <KpiCard icon={<IconTrend />} tone="purple" label="Total Spend Shown" value={`₹${(totalFuel + totalExpenses).toLocaleString()}`} sub="See Reports for operational cost (fuel + maintenance)" />
      </div>

      <div className="panel">
        <div className="panel-head" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div className="filters">
            <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
              <option value="">All vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.regNo})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="tabs">
          <button className={`tab ${tab === 'fuel' ? 'active' : ''}`} onClick={() => setTab('fuel')}>
            Fuel Logs ({fuelLogs.length})
          </button>
          <button className={`tab ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>
            Other Expenses ({expenses.length})
          </button>
        </div>

        <div className="table-scroll">
          {tab === 'fuel' ? (
            <table className="data-table">
              <thead>
                <tr><th>Vehicle</th><th>Liters</th><th>Cost</th><th>Date</th><th>Linked Trip</th></tr>
              </thead>
              <tbody>
                {fuelPager.slice.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="cell-avatar">
                        <div className="mini-avatar"><IconTruck size={15} /></div>
                        <div>
                          <strong>{f.vehicle.regNo}</strong>
                          <div className="muted small">{f.vehicle.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{Number(f.liters).toLocaleString()}</td>
                    <td className="mono">₹{Number(f.cost).toLocaleString()}</td>
                    <td className="muted">{new Date(f.filledAt).toLocaleDateString()}</td>
                    <td className="muted">{f.trip ? `#${f.trip.id} ${f.trip.source} → ${f.trip.destination}` : '—'}</td>
                  </tr>
                ))}
                {fuelLogs.length === 0 && (
                  <tr><td colSpan="5" className="muted center">No fuel logs yet.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Vehicle</th><th>Category</th><th>Amount</th><th>Note</th><th>Date</th></tr>
              </thead>
              <tbody>
                {expPager.slice.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <div className="cell-avatar">
                        <div className="mini-avatar"><IconTruck size={15} /></div>
                        <div>
                          <strong>{x.vehicle.regNo}</strong>
                          <div className="muted small">{x.vehicle.name}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-draft">{x.category}</span></td>
                    <td className="mono">₹{Number(x.amount).toLocaleString()}</td>
                    <td className="muted">{x.note || '—'}</td>
                    <td className="muted">{new Date(x.spentAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan="5" className="muted center">No expenses yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pager pager={pager} />
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.kind === 'fuel' ? 'Add Fuel Log' : 'Add Expense'}</h2>
            <div className="form-grid">
              <label>Vehicle
                <select value={form.vehicleId} onChange={set('vehicleId')} required>
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.regNo})</option>
                  ))}
                </select>
              </label>
              {form.kind === 'fuel' ? (
                <>
                  <label>Liters<input type="number" min="0.01" step="0.01" value={form.liters} onChange={set('liters')} required /></label>
                  <label>Cost<input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} required /></label>
                  <label>Date<input type="date" value={form.filledAt} onChange={set('filledAt')} /></label>
                </>
              ) : (
                <>
                  <label>Category
                    <select value={form.category} onChange={set('category')}>
                      <option value="TOLL">Toll</option>
                      <option value="PARKING">Parking</option>
                      <option value="FINE">Fine</option>
                      <option value="MISC">Misc</option>
                    </select>
                  </label>
                  <label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} required /></label>
                  <label>Note<input value={form.note} onChange={set('note')} placeholder="NH48 tolls" /></label>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-dark">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
