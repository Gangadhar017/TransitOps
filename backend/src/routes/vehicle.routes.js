const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authorize } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

function validateVehicle(body) {
  const { regNo, name, type, maxLoadKg, acquisitionCost } = body;
  if (!regNo || !regNo.trim()) throw new ApiError(400, 'Registration number is required');
  if (!name || !name.trim()) throw new ApiError(400, 'Vehicle name is required');
  if (!type || !type.trim()) throw new ApiError(400, 'Vehicle type is required');
  if (!(Number(maxLoadKg) > 0)) throw new ApiError(400, 'Max load capacity must be a positive number');
  if (!(Number(acquisitionCost) >= 0)) throw new ApiError(400, 'Acquisition cost must be a number');
}

// GET /api/vehicles?status=&type=&region=&available=true&search=
// available=true -> ONLY vehicles legal to dispatch (business rule: never Retired / In Shop / On Trip)
router.get('/', async (req, res, next) => {
  try {
    const { status, type, region, available, search } = req.query;
    const where = {};
    if (available === 'true') where.status = 'AVAILABLE';
    else if (status) where.status = status;
    if (type) where.type = type;
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { regNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const vehicles = await prisma.vehicle.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(req.params.id) },
      include: { maintenanceLogs: true, fuelLogs: true, expenses: true },
    });
    if (!vehicle) throw new ApiError(404, 'Vehicle not found');
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('FLEET_MANAGER'), async (req, res, next) => {
  try {
    validateVehicle(req.body);
    const { regNo, name, type, maxLoadKg, odometerKm, acquisitionCost, region } = req.body;
    const vehicle = await prisma.vehicle.create({
      data: {
        regNo: regNo.trim().toUpperCase(),
        name: name.trim(),
        type: type.trim(),
        maxLoadKg,
        odometerKm: odometerKm || 0,
        acquisitionCost,
        region: region || null,
      },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    next(err); // duplicate regNo -> P2002 -> 409 via errorHandler
  }
});

router.put('/:id', authorize('FLEET_MANAGER'), async (req, res, next) => {
  try {
    validateVehicle(req.body);
    const { regNo, name, type, maxLoadKg, odometerKm, acquisitionCost, region, status } = req.body;
    const vehicle = await prisma.vehicle.update({
      where: { id: Number(req.params.id) },
      data: { regNo: regNo.trim().toUpperCase(), name: name.trim(), type: type.trim(), maxLoadKg, odometerKm, acquisitionCost, region, status },
    });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

// Retire instead of hard delete when the vehicle has history (keeps reports intact)
router.delete('/:id', authorize('FLEET_MANAGER'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tripCount = await prisma.trip.count({ where: { vehicleId: id } });
    if (tripCount > 0) {
      const vehicle = await prisma.vehicle.update({ where: { id }, data: { status: 'RETIRED' } });
      return res.json({ retired: true, vehicle });
    }
    await prisma.vehicle.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
