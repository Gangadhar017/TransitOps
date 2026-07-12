const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authorize } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

// RBAC matrix: Fuel Logs — CRUD = Financial Analyst; Read = FM & Safety Officer; Driver has no access
const CAN_WRITE = ['FINANCIAL_ANALYST'];
const CAN_READ = ['FINANCIAL_ANALYST', 'FLEET_MANAGER', 'SAFETY_OFFICER'];

// GET /api/fuel-logs?vehicleId=
router.get('/', authorize(...CAN_READ), async (req, res, next) => {
  try {
    const where = req.query.vehicleId ? { vehicleId: Number(req.query.vehicleId) } : {};
    const logs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: true, trip: true },
      orderBy: { filledAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize(...CAN_WRITE), async (req, res, next) => {
  try {
    const { vehicleId, tripId, liters, cost, filledAt } = req.body;
    if (!(Number(liters) > 0)) throw new ApiError(400, 'Liters must be a positive number');
    if (!(Number(cost) >= 0)) throw new ApiError(400, 'Cost must be a number');
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: Number(vehicleId),
        tripId: tripId ? Number(tripId) : null,
        liters,
        cost,
        filledAt: filledAt ? new Date(filledAt) : new Date(),
      },
      include: { vehicle: true },
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
