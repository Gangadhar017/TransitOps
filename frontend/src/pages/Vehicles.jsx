import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import { usePager, Pager } from '../components/Pagination';
import { IconTruck, IconRoute, IconWrench, IconMoon, IconPlus, IconSearch } from '../components/icons';

const EMPTY = { regNo: '', name: '', type: 'Van', maxLoadKg: '', odometerKm: '', acquisitionCost: '', region: 'West' };

export default function Vehicles() {
  const { user } = useAuth();
  const canWrite = user.role === 'FLEET_MANAGER';
  const [vehicles, setVehicles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    try {
      setVehicles(await api.get(`/vehicles?${params}`));
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, search]);

  const pager = usePager(vehicles, 8);

  async function save(e) {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/vehicles/${form.id}`, form);
        toast.success(`Vehicle ${form.regNo} updated.`);
      } else {
        await api.post('/vehicles', form);
        toast.success(`Vehicle ${form.regNo} registered.`);
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.message); // e.g. "A record with this reg_no already exists."
    }
  }

  async function remove(v) {
    if (!confirm(`Delete/retire ${v.name} (${v.regNo})?`)) return;
    try {
      const res = await api.del(`/vehicles/${v.id}`);
      toast.success(res.retired ? `${v.name} has trip history — marked as Retired.` : `${v.name} deleted.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const count = (s) => vehicles.filter((v) => v.status === s).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Vehicle Management</h1>
          <p className="page-sub">Monitor, track, and manage your active fleet resources.</p>
        </div>
        <div className="filters">
          {canWrite && (
            <button className="btn btn-dark" onClick={() => setForm({ ...EMPTY })}>
              <IconPlus size={15} /> Add New Vehicle
            </button>
          )}
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={<IconTruck />} tone="blue" label="Total Fleet" value={vehicles.length} />
        <KpiCard icon={<IconRoute />} tone="green" label="Active Units (On Trip)" value={count('ON_TRIP')} />
        <KpiCard icon={<IconWrench />} tone="red" label="Units in Maintenance" value={count('IN_SHOP')} />
        <KpiCard icon={<IconMoon />} tone="amber" label="Idle Units (Available)" value={count('AVAILABLE')} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Vehicle Roster</h2>
          <div className="filters">
            <div className="topbar-search" style={{ maxWidth: 240 }}>
              <IconSearch size={15} />
              <input placeholder="Search roster…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="IN_SHOP">In Shop</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reg No</th><th>Model / Make</th><th>Type</th><th>Max Load (kg)</th>
                <th>Odometer (km)</th><th>Region</th><th>Current Status</th>
                {canWrite && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.regNo}</td>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.type}</td>
                  <td>{Number(v.maxLoadKg).toLocaleString()}</td>
                  <td className="mono">{Number(v.odometerKm).toLocaleString()}</td>
                  <td>{v.region || '—'}</td>
                  <td><span className={`badge badge-${v.status.toLowerCase()}`}>{v.status.replaceAll('_', ' ')}</span></td>
                  {canWrite && (
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...v })}>Edit</button>
                      <button className="btn btn-ghost btn-sm danger" onClick={() => remove(v)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><td colSpan="8" className="muted center">No vehicles match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? 'Edit Vehicle' : 'Register Vehicle'}</h2>
            <p className="muted small">Registration numbers are unique — duplicates are rejected by the database.</p>
            <div className="form-grid">
              <label>Registration No<input value={form.regNo} onChange={set('regNo')} placeholder="GJ01AB1234" required /></label>
              <label>Name / Model<input value={form.name} onChange={set('name')} placeholder="Van-05" required /></label>
              <label>Type
                <select value={form.type} onChange={set('type')}>
                  <option>Truck</option><option>Mini Truck</option><option>Van</option><option>Bike</option>
                </select>
              </label>
              <label>Max Load (kg)<input type="number" min="1" value={form.maxLoadKg} onChange={set('maxLoadKg')} required /></label>
              <label>Odometer (km)<input type="number" min="0" value={form.odometerKm} onChange={set('odometerKm')} /></label>
              <label>Acquisition Cost<input type="number" min="0" value={form.acquisitionCost} onChange={set('acquisitionCost')} required /></label>
              <label>Region
                <select value={form.region || ''} onChange={set('region')}>
                  <option>North</option><option>South</option><option>East</option><option>West</option><option>Central</option>
                </select>
              </label>
              {form.id && (
                <label>Status
                  <select value={form.status} onChange={set('status')}>
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_SHOP">In Shop</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-dark">{form.id ? 'Save Changes' : 'Register Vehicle'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
