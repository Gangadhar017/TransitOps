const { PrismaClient } = require('@prisma/client');

// Single shared client (avoids exhausting Postgres connections during dev hot-reloads)
const prisma = new PrismaClient();

module.exports = prisma;
