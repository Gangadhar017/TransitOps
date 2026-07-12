const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authorize } = require('../middleware/auth');
const tripService = require('../services/trip.service');

// RBAC: Driver owns the trip lifecycle; Fleet Manager has full access to everything
const CAN_MANAGE = ['DRIVER', 'FLEET_MANAGER'];

// GET /api/trips?status=
router.get('/', async (req, res, next) => {
  try {
    const where = req.query.status ? { status: req.query.status } : {};
    const trips = await prisma.trip.findMany({
      where,
      include: { vehicle: true, driver: true, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(trips);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize(...CAN_MANAGE), async (req, res, next) => {
  try {
    const trip = await tripService.createTrip(req.body, req.user.id);
    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/dispatch', authorize(...CAN_MANAGE), async (req, res, next) => {
  try {
    res.json(await tripService.dispatchTrip(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', authorize(...CAN_MANAGE), async (req, res, next) => {
  try {
    res.json(await tripService.completeTrip(Number(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', authorize(...CAN_MANAGE), async (req, res, next) => {
  try {
    res.json(await tripService.cancelTrip(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
