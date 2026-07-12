// TODO (Member 3, hours 1-3): build this exactly like Vehicles.jsx.
// API is ready:
//   GET    /api/drivers?status=&search=          list + filters
//   POST   /api/drivers                          { name, licenseNo, licenseCategory, licenseExpiry, contact, safetyScore }
//   PUT    /api/drivers/:id                      same fields + status (AVAILABLE | ON_TRIP | OFF_DUTY | SUSPENDED)
//   DELETE /api/drivers/:id
// Extra polish that scores points:
//   - Highlight rows where licenseExpiry < today (red badge "License expired")
//   - Safety score as a small colored bar (>=80 green, >=50 amber, else red)
//   - Writes only for SAFETY_OFFICER / FLEET_MANAGER (check useAuth().user.role)
export default function Drivers() {
  return (
    <div>
      <div className="page-head"><h1>Driver Management</h1></div>
      <p className="muted">TODO: copy the pattern from Vehicles.jsx — see comments at the top of this file.</p>
    </div>
  );
}
