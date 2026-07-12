// Central error handling: every thrown ApiError becomes a clean JSON response,
// and Prisma unique-constraint violations become friendly 409s.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Prisma: unique constraint violation (e.g. duplicate registration number)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({ error: `A record with this ${field} already exists.` });
  }
  // Prisma: record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { ApiError, errorHandler };
