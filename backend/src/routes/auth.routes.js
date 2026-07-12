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
    res.status(201).json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role.name } });
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

    res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role.name } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
