const router = require('express').Router();
const prisma = require('../lib/prisma');

// GET /api/dashboard?type=&region= — every KPI from the problem statement in one call
router.get('/', async (req, res, next) => {
  try {
    const vehicleFilter = {};
    if (req.query.type) vehicleFilter.type = req.query.type;
    if (req.query.region) vehicleFilter.region = req.query.region;

    const [
      totalVehicles,
      availableVehicles,
      onTripVehicles,
      inShopVehicles,
      retiredVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      totalDrivers,
    ] = await Promise.all([
      prisma.vehicle.count({ where: vehicleFilter }),
      prisma.vehicle.count({ where: { ...vehicleFilter, status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { ...vehicleFilter, status: 'ON_TRIP' } }),
      prisma.vehicle.count({ where: { ...vehicleFilter, status: 'IN_SHOP' } }),
      prisma.vehicle.count({ where: { ...vehicleFilter, status: 'RETIRED' } }),
      prisma.trip.count({ where: { status: 'DISPATCHED' } }),
      prisma.trip.count({ where: { status: 'DRAFT' } }),
      prisma.driver.count({ where: { status: { in: ['AVAILABLE', 'ON_TRIP'] } } }),
      prisma.driver.count(),
    ]);

    // Fleet Utilization % = vehicles on trip / active fleet (total minus retired)
    const activeFleet = totalVehicles - retiredVehicles;
    const fleetUtilization = activeFleet > 0 ? Math.round((onTripVehicles / activeFleet) * 1000) / 10 : 0;

    res.json({
      totalVehicles,
      availableVehicles,
      activeVehicles: onTripVehicles,
      inMaintenance: inShopVehicles,
      retiredVehicles,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      totalDrivers,
      fleetUtilization,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
