// `npm test`: starts TransitOps on its built-in PostgreSQL, runs the end-to-end
// suite against it, and shuts everything down. Needs nothing installed besides Node.
const { spawn } = require('child_process');
const path = require('path');

process.env.TRANSITOPS_DB = 'embedded';
process.env.DEMO_MODE = 'true';

(async () => {
  const { start } = require('../src/server');
  const app = await start({ port: 0 }); // any free port
  const suite = spawn(process.execPath, [path.join(__dirname, 'e2e.mjs')], {
    stdio: 'inherit',
    env: { ...process.env, API_URL: `http://127.0.0.1:${app.port}/api` },
  });
  suite.on('exit', async (code) => {
    await app.stop();
    process.exitCode = code === null ? 1 : code;
    // Nothing should be left running; this is only a safety net.
    setTimeout(() => process.exit(process.exitCode), 4000).unref();
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
