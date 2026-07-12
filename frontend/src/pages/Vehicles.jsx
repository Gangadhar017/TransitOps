import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Full CRUD page — use this as the PATTERN for Drivers / Maintenance / Expenses pages.
const EMPTY = { regNo: '', name: '', type: 'Van', maxLoadKg: '', odometerKm: '', acquisitionCost: '', region: 'West' };

export default function Vehicles() {
  const { user } = useAuth();
  const canWrite = user.role === 'FLEET_MANAGER';
  const [vehicles, setVehicles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null = closed, {} = create, {id} = edit
  const [error, setError] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    try {
      setVehicles(await api.get(`/vehicles?${params}`));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, search]);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      if (form.id) await api.put(`/vehicles/${form.id}`, form);
      else await api.post('/vehicles', form);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message); // e.g. "A record with this reg_no already exists."
    }
  }

  async function remove(v) {
    if (!confirm(`Delete/retire ${v.name} (${v.regNo})?`)) return;
    try {
      await api.del(`/vehicles/${v.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="page-head">
        <h1>Vehicle Registry</h1>
        <div className="filters">
          <input placeholder="Search name / reg no…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="IN_SHOP">In Shop</option>
            <option value="RETIRED">Retired</option>
          </select>
          {canWrite && (
            <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>
              + Add Vehicle
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Reg No</th>
            <th>Name</th>
            <th>Type</th>
            <th>Max Load (kg)</th>
            <th>Odometer (km)</th>
            <th>Region</th>
            <th>Status</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td className="mono">{v.regNo}</td>
              <td>{v.name}</td>
              <td>{v.type}</td>
              <td>{Number(v.maxLoadKg).toLocaleString()}</td>
              <td>{Number(v.odometerKm).toLocaleString()}</td>
              <td>{v.region || '—'}</td>
              <td>
                <span className={`badge badge-${v.status.toLowerCase()}`}>{v.status.replaceAll('_', ' ')}</span>
              </td>
              {canWrite && (
                <td className="row-actions">
                  <button className="btn btn-ghost" onClick={() => setForm({ ...v })}>Edit</button>
                  <button className="btn btn-ghost danger" onClick={() => remove(v)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr>
              <td colSpan="8" className="muted center">No vehicles match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? 'Edit Vehicle' : 'Register Vehicle'}</h2>
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
              <button className="btn btn-primary">{form.id ? 'Save changes' : 'Register'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
