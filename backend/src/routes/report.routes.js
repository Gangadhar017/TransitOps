const router = require('express').Router();
const prisma = require('../lib/prisma');

// Per-vehicle analytics:
//   distance        = sum of (endOdometer - startOdometer) over completed trips
//   fuelEfficiency  = distance / liters (km per liter)
//   operationalCost = fuel cost + maintenance cost
//   roi             = (revenue - (maintenance + fuel)) / acquisition cost
async function buildVehicleReport() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: { where: { status: 'COMPLETED' } },
      fuelLogs: true,
      maintenanceLogs: true,
      expenses: true,
    },
    orderBy: { regNo: 'asc' },
  });

  return vehicles.map((v) => {
    const distanceKm = v.trips.reduce(
      (sum, t) => sum + (Number(t.endOdometerKm || 0) - Number(t.startOdometerKm || 0)),
      0
    );
    const fuelLiters = v.fuelLogs.reduce((s, f) => s + Number(f.liters), 0);
    const fuelCost = v.fuelLogs.reduce((s, f) => s + Number(f.cost), 0);
    const maintenanceCost = v.maintenanceLogs.reduce((s, m) => s + Number(m.cost), 0);
    const otherExpenses = v.expenses.reduce((s, e) => s + Number(e.amount), 0);
    const revenue = v.trips.reduce((s, t) => s + Number(t.revenue), 0);
    const operationalCost = fuelCost + maintenanceCost;
    const acquisition = Number(v.acquisitionCost);

    return {
      vehicleId: v.id,
      regNo: v.regNo,
      name: v.name,
      type: v.type,
      status: v.status,
      completedTrips: v.trips.length,
      distanceKm: round1(distanceKm),
      fuelLiters: round1(fuelLiters),
      fuelEfficiencyKmPerL: fuelLiters > 0 ? round1(distanceKm / fuelLiters) : null,
      fuelCost: round2(fuelCost),
      maintenanceCost: round2(maintenanceCost),
      otherExpenses: round2(otherExpenses),
      operationalCost: round2(operationalCost),
      revenue: round2(revenue),
      roi: acquisition > 0 ? round2((revenue - operationalCost) / acquisition) : null,
    };
  });
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

// GET /api/reports/vehicles            -> JSON
// GET /api/reports/vehicles?format=csv -> CSV download (mandatory deliverable)
router.get('/vehicles', async (req, res, next) => {
  try {
    const report = await buildVehicleReport();
    if (req.query.format === 'csv') {
      const headers = Object.keys(report[0] || { info: 'no data' });
      const rows = report.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transitops-vehicle-report.csv"');
      return res.send(csv);
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
