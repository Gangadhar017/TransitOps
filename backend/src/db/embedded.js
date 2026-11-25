// A private PostgreSQL server that lives and dies with this process.
//
// Free hosted databases expire; a demo that depends on one stops working a month
// later. So when no reachable DATABASE_URL is configured, TransitOps starts its
// own PostgreSQL from the binaries shipped in the `embedded-postgres` package:
// same engine, same enums, same transactions, nothing to provision.
// The data directory is temporary, so every start begins from the seed data.
const os = require('os');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');

// Asks the operating system for a port nobody is using.
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startEmbeddedPostgres() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');

  const databaseDir = process.env.EMBEDDED_PG_DIR || path.join(os.tmpdir(), `transitops-pg-${process.pid}`);
  fs.rmSync(databaseDir, { recursive: true, force: true });

  const user = 'transitops';
  const password = crypto.randomBytes(18).toString('hex'); // never leaves this machine
  const port = Number(process.env.EMBEDDED_PG_PORT) || (await freePort());

  const pg = new EmbeddedPostgres({
    databaseDir,
    user,
    password,
    port,
    persistent: false,
    // Small footprint: the free instance this runs on has 512 MB of memory.
    postgresFlags: ['-c', 'shared_buffers=24MB', '-c', 'max_connections=20', '-c', 'listen_addresses=127.0.0.1'],
    onLog: () => {},
    // PostgreSQL writes its ordinary log to stderr; only pass on real problems.
    onError: (out) => {
      const text = String(out && out.message ? out.message : out);
      if (/FATAL|PANIC|ERROR/.test(text)) console.error('[postgres]', text.trim());
    },
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase('transitops');

  return {
    url: `postgresql://${user}:${password}@127.0.0.1:${port}/transitops?schema=public`,
    stop: () => pg.stop(),
  };
}

module.exports = { startEmbeddedPostgres };
