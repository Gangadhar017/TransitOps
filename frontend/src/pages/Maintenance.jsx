// TODO (Member 3, hours 3-5): maintenance workflow page.
//   GET  /api/maintenance?status=OPEN|CLOSED       list (includes vehicle)
//   POST /api/maintenance                          { vehicleId, title, description, cost } -> vehicle auto IN_SHOP
//   POST /api/maintenance/:id/close                { cost? } -> vehicle back to AVAILABLE
// Demo moment: open a log for an Available vehicle, switch to Trips page and show
// it has disappeared from the vehicle dropdown, then close the log and show it back.
export default function Maintenance() {
  return (
    <div>
      <div className="page-head"><h1>Maintenance</h1></div>
      <p className="muted">TODO: build per the comments at the top of this file.</p>
    </div>
  );
}
