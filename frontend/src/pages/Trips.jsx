import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import { usePager, Pager } from '../components/Pagination';
import { IconRoute, IconTruck, IconTrend, IconAlert, IconPlus } from '../components/icons';

const EMPTY = { source: '', destination: '', vehicleId: '', driverId: '', cargoWeightKg: '', plannedDistanceKm: '' };

export default function Trips() {
  const { user } = useAuth();
  // RBAC: Driver owns the trip lifecycle; Fleet Manager has full access
  const canManage = ['DRIVER', 'FLEET_MANAGER'].includes(user.role);
  const [trips, setTrips] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(null);
  const [completing, setCompleting] = useState(null);

  async function load() {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    try {
      setTrips(await api.get(`/trips${params}`));
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  const pager = usePager(trips, 8);

  async function openCreate() {
    try {
      const [v, d] = await Promise.all([api.get('/vehicles?available=true'), api.get('/drivers?assignable=true')]);
      setVehicles(v);
      setDrivers(d);
      setForm({ ...EMPTY });
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function createTrip(e) {
    e.preventDefault();
    try {
      await api.post('/trips', form);
      setForm(null);
      toast.success('Trip created as Draft. Dispatch it when ready.');
      load();
    } catch (err) {
      toast.error(err.message); // e.g. "Cargo 550 kg exceeds Van-05's capacity of 500 kg"
    }
  }

  async function act(trip, action, body = {}) {
    try {
      await api.post(`/trips/${trip.id}/${action}`, body);
      const messages = {
        dispatch: `Trip #${trip.id} dispatched — ${trip.vehicle.name} and ${trip.driver.name} are now On Trip.`,
        complete: `Trip #${trip.id} completed — vehicle and driver are Available again.`,
        cancel: `Trip #${trip.id} cancelled${trip.status === 'DISPATCHED' ? ' — vehicle and driver restored to Available.' : '.'}`,
      };
      toast.success(messages[action]);
      setCompleting(null);
      load();
    } catch (err) {
      toast.error(err.message); // e.g. "Ravi Expired's license expired on 2026-06-12"
    }
  }

  function completeSubmit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    act(completing, 'complete', {
      endOdometerKm: Number(f.get('endOdometerKm')),
      fuelLiters: Number(f.get('fuelLiters')) || 0,
      fuelCost: Number(f.get('fuelCost')) || 0,
      revenue: Number(f.get('revenue')) || 0,
    });
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const selectedVehicle = vehicles.find((v) => v.id === Number(form?.vehicleId));
  const count = (s) => trips.filter((t) => t.status === s).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Trip Management</h1>
          <p className="page-sub">Create, dispatch, and track deliveries with automated validation.</p>
        </div>
        {canManage && (
          <button className="btn btn-dark" onClick={openCreate}>
            <IconPlus size={15} /> New Trip
          </button>
        )}
      </div>

      <div className="kpi-grid">
        <KpiCard icon={<IconRoute />} tone="blue" label="On Route" value={count('DISPATCHED')} sub="Currently dispatched" />
        <KpiCard icon={<IconAlert />} tone="amber" label="Pending (Draft)" value={count('DRAFT')} sub="Awaiting dispatch" />
        <KpiCard icon={<IconTrend />} tone="green" label="Completed" value={count('COMPLETED')} sub="Successfully delivered" />
        <KpiCard icon={<IconTruck />} tone="red" label="Cancelled" value={count('CANCELLED')} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Trip Ledger</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Route</th><th>Vehicle</th><th>Driver</th>
                <th>Cargo (kg)</th><th>Distance (km)</th><th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((t) => (
                <tr key={t.id}>
                  <td className="mono">#{t.id}</td>
                  <td><strong>{t.source}</strong> → <strong>{t.destination}</strong></td>
                  <td>
                    <strong>{t.vehicle.name}</strong>
                    <div className="muted small mono">{t.vehicle.regNo}</div>
                  </td>
                  <td>{t.driver.name}</td>
                  <td>{Number(t.cargoWeightKg).toLocaleString()}</td>
                  <td>
                    {t.status === 'COMPLETED' && t.endOdometerKm
                      ? `${(Number(t.endOdometerKm) - Number(t.startOdometerKm)).toLocaleString()} actual`
                      : `${Number(t.plannedDistanceKm).toLocaleString()} planned`}
                  </td>
                  <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span></td>
                  {canManage && (
                    <td className="row-actions">
                      {t.status === 'DRAFT' && (
                        <>
                          <button className="btn btn-blue btn-sm" onClick={() => act(t, 'dispatch')}>Dispatch</button>
                          <button className="btn btn-ghost btn-sm danger" onClick={() => act(t, 'cancel')}>Cancel</button>
                        </>
                      )}
                      {t.status === 'DISPATCHED' && (
                        <>
                          <button className="btn btn-blue btn-sm" onClick={() => setCompleting(t)}>Complete</button>
                          <button className="btn btn-ghost btn-sm danger" onClick={() => act(t, 'cancel')}>Cancel</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {trips.length === 0 && (
                <tr><td colSpan="8" className="muted center">No trips yet — create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={createTrip}>
            <h2>New Trip</h2>
            <p className="muted small">Only dispatch-legal vehicles and assignable drivers appear below — business rules are enforced again at dispatch.</p>
            <div className="form-grid">
              <label>Source<input value={form.source} onChange={set('source')} placeholder="Ahmedabad" required /></label>
              <label>Destination<input value={form.destination} onChange={set('destination')} placeholder="Mumbai" required /></label>
              <label>Vehicle (available only)
                <select value={form.vehicleId} onChange={set('vehicleId')} required>
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.regNo}) — max {Number(v.maxLoadKg).toLocaleString()} kg
                    </option>
                  ))}
                </select>
              </label>
              <label>Driver (assignable only)
                <select value={form.driverId} onChange={set('driverId')} required>
                  <option value="">Select a driver…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.licenseCategory}, score {d.safetyScore}</option>
                  ))}
                </select>
              </label>
              <label>
                Cargo Weight (kg){selectedVehicle && <span className="muted small"> — capacity {Number(selectedVehicle.maxLoadKg).toLocaleString()} kg</span>}
                <input type="number" min="1" value={form.cargoWeightKg} onChange={set('cargoWeightKg')} required />
              </label>
              <label>Planned Distance (km)<input type="number" min="1" value={form.plannedDistanceKm} onChange={set('plannedDistanceKm')} required /></label>
            </div>
            {vehicles.length === 0 && <p className="alert alert-error" style={{ marginTop: 14 }}>No vehicles are currently available for dispatch.</p>}
            {drivers.length === 0 && <p className="alert alert-error" style={{ marginTop: 14 }}>No drivers are currently assignable (available + valid license).</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-dark">Create Draft</button>
            </div>
          </form>
        </div>
      )}

      {completing && (
        <div className="modal-backdrop" onClick={() => setCompleting(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={completeSubmit}>
            <h2>Complete Trip #{completing.id}</h2>
            <p className="muted small">
              {completing.source} → {completing.destination} · {completing.vehicle.name} · start odometer{' '}
              {Number(completing.startOdometerKm).toLocaleString()} km
            </p>
            <div className="form-grid">
              <label>Final Odometer (km)
                <input name="endOdometerKm" type="number" min={Number(completing.startOdometerKm)} step="0.1" required autoFocus />
              </label>
              <label>Fuel Consumed (liters)<input name="fuelLiters" type="number" min="0" step="0.01" /></label>
              <label>Fuel Cost<input name="fuelCost" type="number" min="0" step="0.01" /></label>
              <label>Trip Revenue<input name="revenue" type="number" min="0" step="0.01" /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCompleting(null)}>Cancel</button>
              <button className="btn btn-dark">Complete Trip</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
