import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import { usePager, Pager } from '../components/Pagination';
import { IconUser, IconRoute, IconCalendar, IconAlert, IconPlus, IconSearch } from '../components/icons';

const EMPTY = { name: '', licenseNo: '', licenseCategory: 'LMV', licenseExpiry: '', contact: '', safetyScore: 100 };

const scoreTone = (s) => (s >= 80 ? 'green' : s >= 50 ? 'amber' : 'red');
const isExpired = (d) => new Date(d) < new Date();
const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function Drivers() {
  const { user } = useAuth();
  // RBAC matrix: Drivers CRUD = Safety Officer only
  const canWrite = user.role === 'SAFETY_OFFICER';
  const [drivers, setDrivers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);

  async function load() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    try {
      setDrivers(await api.get(`/drivers?${params}`));
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, search]);

  const pager = usePager(drivers, 8);

  async function save(e) {
    e.preventDefault();
    try {
      if (form.id) {
        await api.put(`/drivers/${form.id}`, form);
        toast.success(`Driver ${form.name} updated.`);
      } else {
        await api.post('/drivers', form);
        toast.success(`Driver ${form.name} registered.`);
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(d) {
    if (!confirm(`Delete driver ${d.name}?`)) return;
    try {
      await api.del(`/drivers/${d.id}`);
      toast.success(`Driver ${d.name} deleted.`);
      load();
    } catch (err) {
      toast.error(err.message); // e.g. "Driver has trip history — suspend instead"
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const expiredCount = drivers.filter((d) => isExpired(d.licenseExpiry)).length;
  const suspendedCount = drivers.filter((d) => d.status === 'SUSPENDED').length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Driver Management</h1>
          <p className="page-sub">Monitor roster status, credentials, and assignments.</p>
        </div>
        {canWrite && (
          <button className="btn btn-dark" onClick={() => setForm({ ...EMPTY })}>
            <IconPlus size={15} /> Add Driver
          </button>
        )}
      </div>

      <div className="kpi-grid">
        <KpiCard icon={<IconUser />} tone="blue" label="Total Drivers" value={drivers.length} />
        <KpiCard icon={<IconRoute />} tone="green" label="On Trip" value={drivers.filter((d) => d.status === 'ON_TRIP').length} sub="Active deployments" />
        <KpiCard icon={<IconCalendar />} tone="green" label="Available" value={drivers.filter((d) => d.status === 'AVAILABLE' && !isExpired(d.licenseExpiry)).length} sub="Ready for dispatch" />
        <KpiCard
          icon={<IconAlert />} tone="red" label="Alerts" value={expiredCount + suspendedCount}
          sub={`Expired licenses (${expiredCount}), Suspended (${suspendedCount})`}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Driver Roster</h2>
          <div className="filters">
            <div className="topbar-search" style={{ maxWidth: 240 }}>
              <IconSearch size={15} />
              <input placeholder="Search drivers…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="OFF_DUTY">Off Duty</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name</th><th>License No</th><th>License Status</th>
                <th>Duty Status</th><th>Safety Score</th><th>Contact</th>
                {canWrite && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="cell-avatar">
                      <div className="mini-avatar">{initials(d.name)}</div>
                      <div>
                        <strong>{d.name}</strong>
                        <div className="muted small">{d.licenseCategory}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono">{d.licenseNo}</td>
                  <td>
                    {isExpired(d.licenseExpiry) ? (
                      <span className="badge badge-expired">EXPIRED</span>
                    ) : (
                      <span className="badge badge-active">ACTIVE</span>
                    )}
                    <div className="muted small" style={{ marginTop: 4 }}>till {new Date(d.licenseExpiry).toLocaleDateString()}</div>
                  </td>
                  <td><span className={`badge badge-${d.status.toLowerCase()}`}>{d.status.replaceAll('_', ' ')}</span></td>
                  <td>
                    <div className="score-cell">
                      <div className="score-bar">
                        <div className={`score-fill score-${scoreTone(d.safetyScore)}`} style={{ width: `${d.safetyScore}%` }} />
                      </div>
                      <span className="mono">{d.safetyScore}</span>
                    </div>
                  </td>
                  <td className="mono">{d.contact}</td>
                  {canWrite && (
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...d, licenseExpiry: d.licenseExpiry.slice(0, 10) })}>Edit</button>
                      <button className="btn btn-ghost btn-sm danger" onClick={() => remove(d)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {drivers.length === 0 && (
                <tr><td colSpan="7" className="muted center">No drivers match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{form.id ? 'Edit Driver' : 'Register Driver'}</h2>
            <div className="form-grid">
              <label>Name<input value={form.name} onChange={set('name')} placeholder="Alex Kumar" required /></label>
              <label>License No<input value={form.licenseNo} onChange={set('licenseNo')} placeholder="DL-2024-010" required /></label>
              <label>License Category
                <select value={form.licenseCategory} onChange={set('licenseCategory')}>
                  <option>LMV</option><option>HMV</option><option>MCWG</option><option>TRANS</option>
                </select>
              </label>
              <label>License Expiry<input type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')} required /></label>
              <label>Contact (10 digits)<input value={form.contact} onChange={set('contact')} placeholder="9876500001" pattern="\d{10}" required /></label>
              <label>Safety Score (0–100)<input type="number" min="0" max="100" value={form.safetyScore} onChange={set('safetyScore')} /></label>
              {form.id && (
                <label>Status
                  <select value={form.status} onChange={set('status')}>
                    <option value="AVAILABLE">Available</option>
                    <option value="OFF_DUTY">Off Duty</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-dark">{form.id ? 'Save Changes' : 'Register Driver'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
