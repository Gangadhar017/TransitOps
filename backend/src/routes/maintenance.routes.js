const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authorize } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

// GET /api/maintenance?status=OPEN|CLOSED
router.get('/', async (req, res, next) => {
  try {
    const where = req.query.status ? { status: req.query.status } : {};
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { openedAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance — opening a log flips the vehicle to IN_SHOP (atomic)
router.post('/', authorize('FLEET_MANAGER'), async (req, res, next) => {
  try {
    const { vehicleId, title, description, cost } = req.body;
    if (!title || !title.trim()) throw new ApiError(400, 'Maintenance title is required (e.g. "Oil Change")');

    const log = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: Number(vehicleId) } });
      if (!vehicle) throw new ApiError(404, 'Vehicle not found');
      if (vehicle.status === 'ON_TRIP') throw new ApiError(409, `${vehicle.name} is on a trip — complete or cancel the trip first`);
      if (vehicle.status === 'RETIRED') throw new ApiError(400, `${vehicle.name} is retired`);

      // Rule: active maintenance -> vehicle In Shop, hidden from dispatch
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: 'IN_SHOP' } });
      return tx.maintenanceLog.create({
        data: { vehicleId: vehicle.id, title: title.trim(), description: description || null, cost: cost || 0 },
        include: { vehicle: true },
      });
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance/:id/close — vehicle returns to AVAILABLE unless retired,
// or unless it still has ANOTHER open maintenance log.
router.post('/:id/close', authorize('FLEET_MANAGER'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.findUnique({ where: { id }, include: { vehicle: true } });
      if (!log) throw new ApiError(404, 'Maintenance log not found');
      if (log.status === 'CLOSED') throw new ApiError(400, 'This maintenance log is already closed');

      const closed = await tx.maintenanceLog.update({
        where: { id },
        data: { status: 'CLOSED', closedAt: new Date(), cost: req.body.cost ?? log.cost },
        include: { vehicle: true },
      });

      const stillOpen = await tx.maintenanceLog.count({
        where: { vehicleId: log.vehicleId, status: 'OPEN' },
      });
      if (stillOpen === 0 && log.vehicle.status !== 'RETIRED') {
        await tx.vehicle.update({ where: { id: log.vehicleId }, data: { status: 'AVAILABLE' } });
      }
      return closed;
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
