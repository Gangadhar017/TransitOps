const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) }));
app.use('/api', routes);

// Unknown API paths get JSON, never the single-page app.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found' }));

// One deployment, one origin: when the frontend has been built, this server
// serves it too, so the browser calls /api with relative URLs and CORS never
// comes into it.
const clientDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  // Any other GET is a client-side route: React Router owns the URL.
  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
}

app.use(errorHandler);

module.exports = app;
