const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authorize } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

// RBAC matrix: Expenses — CRUD = Financial Analyst; Read = FM & Safety Officer; Driver has no access
const CAN_WRITE = ['FINANCIAL_ANALYST'];
const CAN_READ = ['FINANCIAL_ANALYST', 'FLEET_MANAGER', 'SAFETY_OFFICER'];
const CATEGORIES = ['TOLL', 'PARKING', 'FINE', 'MISC'];

// GET /api/expenses?vehicleId=&category=
router.get('/', authorize(...CAN_READ), async (req, res, next) => {
  try {
    const where = {};
    if (req.query.vehicleId) where.vehicleId = Number(req.query.vehicleId);
    if (req.query.category) where.category = req.query.category;
    const expenses = await prisma.expense.findMany({
      where,
      include: { vehicle: true, trip: true },
      orderBy: { spentAt: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize(...CAN_WRITE), async (req, res, next) => {
  try {
    const { vehicleId, tripId, category, amount, note, spentAt } = req.body;
    if (!CATEGORIES.includes(category)) throw new ApiError(400, `Category must be one of: ${CATEGORIES.join(', ')}`);
    if (!(Number(amount) > 0)) throw new ApiError(400, 'Amount must be a positive number');
    const expense = await prisma.expense.create({
      data: {
        vehicleId: Number(vehicleId),
        tripId: tripId ? Number(tripId) : null,
        category,
        amount,
        note: note || null,
        spentAt: spentAt ? new Date(spentAt) : new Date(),
      },
      include: { vehicle: true },
    });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
