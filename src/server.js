// server.js
// Minimal Express server — mainly exists so Render (or UptimeRobot)
// has a /health endpoint to ping to keep the service awake.
// There's no /news endpoint anymore since news is no longer archived
// in the DB — it goes straight to Telegram.

const express = require('express');
const config = require('./config');
const { getAllFetchLogs } = require('./db');
const { startScheduler } = require('./scheduler');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Shows when each category was last polled + how many items were sent —
// useful to confirm the scheduler is actually running.
app.get('/status', (req, res) => {
  res.json(getAllFetchLogs());
});

app.listen(config.port, () => {
  console.log(`[server] Listening on http://localhost:${config.port}`);
  console.log(`[server] Endpoints: GET /health, GET /status`);
  startScheduler();
});
