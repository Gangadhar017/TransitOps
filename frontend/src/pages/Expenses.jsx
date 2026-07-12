// TODO (Member 3, hours 3-5): fuel + expense tracking on one page (two tabs or two tables).
//   GET/POST /api/fuel-logs      { vehicleId, tripId?, liters, cost, filledAt? }
//   GET/POST /api/expenses       { vehicleId, tripId?, category: TOLL|PARKING|FINE|MISC, amount, note? }
// Show a per-vehicle total row: fuel cost + maintenance cost = operational cost
// (or just link to Reports, which already computes it).
export default function Expenses() {
  return (
    <div>
      <div className="page-head"><h1>Fuel &amp; Expenses</h1></div>
      <p className="muted">TODO: build per the comments at the top of this file.</p>
    </div>
  );
}
