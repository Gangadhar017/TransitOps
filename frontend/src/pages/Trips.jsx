// TODO (Member 3+4, hours 1-5): the most important page for the demo.
// API is ready and enforces EVERY business rule — just surface its error messages.
//   GET  /api/trips?status=                                    list (includes vehicle, driver)
//   GET  /api/vehicles?available=true                          dispatch-legal vehicles for the dropdown
//   GET  /api/drivers?assignable=true                          assignable drivers for the dropdown
//   POST /api/trips                                            { source, destination, vehicleId, driverId, cargoWeightKg, plannedDistanceKm }
//   POST /api/trips/:id/dispatch                               Draft -> Dispatched (vehicle+driver flip to On Trip)
//   POST /api/trips/:id/complete                               { endOdometerKm, fuelLiters, fuelCost, revenue }
//   POST /api/trips/:id/cancel                                 Draft/Dispatched -> Cancelled
// UI plan:
//   - Table with status badges + per-row action buttons based on status:
//       DRAFT -> [Dispatch] [Cancel] · DISPATCHED -> [Complete] [Cancel]
//   - "Complete" opens a small modal asking final odometer / fuel liters / fuel cost / revenue
//   - Show api errors in an alert — e.g. try cargo 550 on a 500 kg van during the demo!
export default function Trips() {
  return (
    <div>
      <div className="page-head"><h1>Trip Management</h1></div>
      <p className="muted">TODO: build per the comments at the top of this file. Backend rules are done.</p>
    </div>
  );
}
