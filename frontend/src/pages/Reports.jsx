// TODO (Member 4, hours 3-6): analytics table + CSV export button.
//   GET /api/reports/vehicles              JSON: per-vehicle distance, fuel efficiency,
//                                          fuel/maintenance/operational cost, revenue, ROI
//   GET /api/reports/vehicles?format=csv   CSV download (mandatory deliverable!)
// CSV button:
//   const token = localStorage.getItem('transitops_token')
//   fetch('/api/reports/vehicles?format=csv', { headers: { Authorization: `Bearer ${token}` } })
//     .then(r => r.blob()).then(b => { const a = document.createElement('a');
//       a.href = URL.createObjectURL(b); a.download = 'report.csv'; a.click(); })
// Bonus: a simple bar chart of operational cost per vehicle (pure CSS bars are fine
// and dependency-free — judges like understanding over libraries).
export default function Reports() {
  return (
    <div>
      <div className="page-head"><h1>Reports &amp; Analytics</h1></div>
      <p className="muted">TODO: build per the comments at the top of this file.</p>
    </div>
  );
}
