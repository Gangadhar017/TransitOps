const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authorize } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

// RBAC matrix: Drivers CRUD = Safety Officer only (Fleet Manager is read-only)
const CAN_WRITE = ['SAFETY_OFFICER'];

function validateDriver(body) {
  const { name, licenseNo, licenseCategory, licenseExpiry, contact } = body;
  if (!name || !name.trim()) throw new ApiError(400, 'Driver name is required');
  if (!licenseNo || !licenseNo.trim()) throw new ApiError(400, 'License number is required');
  if (!licenseCategory || !licenseCategory.trim()) throw new ApiError(400, 'License category is required');
  if (!licenseExpiry || isNaN(Date.parse(licenseExpiry))) throw new ApiError(400, 'A valid license expiry date is required');
  if (!contact || !/^\d{10}$/.test(contact)) throw new ApiError(400, 'Contact must be a 10-digit number');
}

// GET /api/drivers?status=&assignable=true&search=
// assignable=true -> only drivers legal for a trip (Available AND license not expired)
router.get('/', async (req, res, next) => {
  try {
    const { status, assignable, search } = req.query;
    const where = {};
    if (assignable === 'true') {
      where.status = 'AVAILABLE';
      where.licenseExpiry = { gte: new Date() };
    } else if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const drivers = await prisma.driver.findMany({ where, orderBy: { name: 'asc' } });
    res.json(drivers);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: Number(req.params.id) },
      include: { trips: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!driver) throw new ApiError(404, 'Driver not found');
    res.json(driver);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize(...CAN_WRITE), async (req, res, next) => {
  try {
    validateDriver(req.body);
    const { name, licenseNo, licenseCategory, licenseExpiry, contact, safetyScore } = req.body;
    const driver = await prisma.driver.create({
      data: {
        name: name.trim(),
        licenseNo: licenseNo.trim().toUpperCase(),
        licenseCategory: licenseCategory.trim(),
        licenseExpiry: new Date(licenseExpiry),
        contact,
        safetyScore: safetyScore ?? 100,
      },
    });
    res.status(201).json(driver);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorize(...CAN_WRITE), async (req, res, next) => {
  try {
    validateDriver(req.body);
    const { name, licenseNo, licenseCategory, licenseExpiry, contact, safetyScore, status } = req.body;
    const driver = await prisma.driver.update({
      where: { id: Number(req.params.id) },
      data: {
        name: name.trim(),
        licenseNo: licenseNo.trim().toUpperCase(),
        licenseCategory: licenseCategory.trim(),
        licenseExpiry: new Date(licenseExpiry),
        contact,
        safetyScore,
        status,
      },
    });
    res.json(driver);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize(...CAN_WRITE), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tripCount = await prisma.trip.count({ where: { driverId: id } });
    if (tripCount > 0) throw new ApiError(409, 'Driver has trip history — set status to Suspended or Off Duty instead of deleting');
    await prisma.driver.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
