// scheduler.js
// The only place that decides when external APIs get hit.
// Each fetcher now sends new items to Telegram inline (no separate
// dispatch step) — the DB only tracks "already sent" hashes.

const cron = require('node-cron');
const config = require('./config');
const { runStockFetch } = require('./fetchers/stockFetcher');
const { runCryptoFetch } = require('./fetchers/cryptoFetcher');
const { runForexFetch, runCalendarFetch } = require('./fetchers/forexFetcher');
const { cleanupOldSeen } = require('./db');

function everyNMinutes(n) {
  return `*/${n} * * * *`;
}

function startScheduler() {
  console.log('[scheduler] Starting cron jobs with intervals:', config.intervals);

  cron.schedule(everyNMinutes(config.intervals.stockMinutes), async () => {
    console.log('[scheduler] running stock/MF/IPO fetch...');
    await runStockFetch().catch((e) => console.error('[scheduler] stock fetch failed:', e.message));
  });

  cron.schedule(everyNMinutes(config.intervals.cryptoMinutes), async () => {
    console.log('[scheduler] running crypto fetch...');
    await runCryptoFetch().catch((e) => console.error('[scheduler] crypto fetch failed:', e.message));
  });

  cron.schedule(everyNMinutes(config.intervals.forexMinutes), async () => {
    console.log('[scheduler] running forex fetch...');
    await runForexFetch().catch((e) => console.error('[scheduler] forex fetch failed:', e.message));
  });

  cron.schedule(everyNMinutes(config.intervals.calendarMinutes), async () => {
    console.log('[scheduler] running economic calendar fetch...');
    await runCalendarFetch().catch((e) => console.error('[scheduler] calendar fetch failed:', e.message));
  });

  // Once a day: trim the seen-hash list so it doesn't grow forever.
  cron.schedule('0 3 * * *', () => {
    cleanupOldSeen();
    console.log('[scheduler] cleaned up old seen-hash entries');
  });

  // Run once immediately on startup so news starts flowing right away.
  runStockFetch().catch((e) => console.error(e.message));
  runCryptoFetch().catch((e) => console.error(e.message));
  runForexFetch().catch((e) => console.error(e.message));
  runCalendarFetch().catch((e) => console.error(e.message));
}

module.exports = { startScheduler };
