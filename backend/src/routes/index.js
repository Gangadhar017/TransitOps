const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth', require('./auth.routes'));

// Everything below requires a valid JWT
router.use(authenticate);
router.use('/vehicles', require('./vehicle.routes'));
router.use('/drivers', require('./driver.routes'));
router.use('/trips', require('./trip.routes'));
router.use('/maintenance', require('./maintenance.routes'));
router.use('/fuel-logs', require('./fuel.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;
