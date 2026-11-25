// Entry point: make sure there is a database, bring its schema up to date,
// load the demo data, then start the API (which also serves the built frontend).
require('dotenv').config();
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const log = (msg) => console.log(`[boot] ${msg}`);

// True when a PostgreSQL server answers at `url` within a few seconds.
async function canReach(url) {
  const { PrismaClient } = require('@prisma/client');
  const probe = new PrismaClient({ datasources: { db: { url } }, log: [] });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
  try {
    await Promise.race([probe.$queryRawUnsafe('SELECT 1'), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    probe.$disconnect().catch(() => {});
  }
}

// Runs the Prisma CLI from node_modules (no npx, no shell).
function prismaCli(...args) {
  return new Promise((resolve, reject) => {
    const cli = require.resolve('prisma/build/index.js');
    const child = spawn(process.execPath, [cli, ...args], { cwd: BACKEND_ROOT, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma ${args.join(' ')} exited with ${code}`))));
  });
}

// Starts everything and resolves once the server is listening.
// Returns { port, stop } so tests can run against it and shut it down cleanly.
async function start({ port = process.env.PORT || 5000 } = {}) {
  let embedded = null;
  const configured = process.env.DATABASE_URL;
  const forceEmbedded = process.env.TRANSITOPS_DB === 'embedded';

  if (configured && !forceEmbedded && (await canReach(configured))) {
    log('using the database in DATABASE_URL');
  } else {
    if (configured && !forceEmbedded) log('DATABASE_URL is set but nothing answers there');
    log('starting the built-in PostgreSQL');
    const { startEmbeddedPostgres } = require('./db/embedded');
    embedded = await startEmbeddedPostgres();
    process.env.DATABASE_URL = embedded.url;
    // The built-in database is recreated on every start, so it is safe to offer
    // one-click demo sign-in unless that was switched off explicitly.
    if (process.env.DEMO_MODE === undefined) process.env.DEMO_MODE = 'true';
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
    log('JWT_SECRET is not set; generated one for this run (sessions end when the server restarts)');
  }

  let server;
  try {
    await prismaCli('migrate', 'deploy');
    await require('../prisma/seed').seed();
    const app = require('./app');
    server = await new Promise((resolve, reject) => {
      const s = app.listen(port, () => resolve(s));
      s.on('error', reject);
    });
  } catch (err) {
    // Never leave the built-in database running behind a failed start.
    if (embedded) await embedded.stop().catch(() => {});
    throw err;
  }
  log(`TransitOps is up on http://localhost:${server.address().port}`);

  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    await new Promise((resolve) => server.close(resolve));
    await require('./lib/prisma').$disconnect().catch(() => {});
    if (embedded) await embedded.stop().catch(() => {});
  }

  return { port: server.address().port, stop };
}

module.exports = { start };

if (require.main === module) {
  start()
    .then(({ stop }) => {
      const shutdown = (signal) => {
        log(`${signal} received, shutting down`);
        stop().finally(() => process.exit(0));
      };
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    })
    .catch((err) => {
      console.error('[boot] failed to start:', err);
      process.exit(1);
    });
}
