const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { ApiError } = require('../middleware/errorHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, role: user.role.name }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  });
}

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role.name });

// One-click demo sign-in. Only on when DEMO_MODE=true, which the server sets itself
// when it runs on the built-in database (recreated from the seed on every start).
const DEMO_ACCOUNTS = [
  { role: 'FLEET_MANAGER', email: 'manager@transitops.com', label: 'Fleet Manager', access: 'Full access: vehicles, drivers, trips, maintenance and costs' },
  { role: 'DRIVER', email: 'driver@transitops.com', label: 'Driver', access: 'Creates, dispatches and completes trips. No access to costs' },
  { role: 'SAFETY_OFFICER', email: 'safety@transitops.com', label: 'Safety Officer', access: 'Manages drivers and licences, reads costs. Cannot create trips' },
  { role: 'FINANCIAL_ANALYST', email: 'analyst@transitops.com', label: 'Financial Analyst', access: 'Records fuel and expenses, reads reports. Cannot change the fleet' },
];
const demoMode = () => process.env.DEMO_MODE === 'true';

// GET /api/auth/demo -> which demo roles can be entered without a password
router.get('/demo', (_req, res) => {
  res.json({
    enabled: demoMode(),
    accounts: demoMode() ? DEMO_ACCOUNTS.map(({ role, label, access }) => ({ role, label, access })) : [],
  });
});

// POST /api/auth/demo  { role } -> signs in as the seeded account for that role
router.post('/demo', async (req, res, next) => {
  try {
    if (!demoMode()) throw new ApiError(404, 'Route not found');
    const account = DEMO_ACCOUNTS.find((a) => a.role === req.body.role);
    if (!account) throw new ApiError(400, 'Unknown demo role');
    const user = await prisma.user.findUnique({ where: { email: account.email }, include: { role: true } });
    if (!user) throw new ApiError(404, 'Demo account not found');
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register  { name, email, password, role }
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !name.trim()) throw new ApiError(400, 'Name is required');
    if (!EMAIL_RE.test(email || '')) throw new ApiError(400, 'Entered email is invalid');
    if (!password || password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

    const roleRow = await prisma.role.findUnique({ where: { name: role || 'DRIVER' } });
    if (!roleRow) throw new ApiError(400, `Unknown role: ${role}`);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase(), passwordHash, roleId: roleRow.id },
      include: { role: true },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!EMAIL_RE.test(email || '')) throw new ApiError(400, 'Entered email is invalid');

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { role: true } });
    const ok = user && (await bcrypt.compare(password || '', user.passwordHash));
    if (!ok) throw new ApiError(401, 'Invalid email or password');

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
