// fetchers/forexFetcher.js
// Forex-tagged news + economic calendar (both Finnhub).
// Same pattern: check hash -> if new -> send -> mark seen.

const fetch = require('node-fetch');
const crypto = require('crypto');
const config = require('../config');
const { hasSeen, markSeen, upsertFetchLog } = require('../db');
const { sendToChannel } = require('../telegram/bot');
const { formatMessage } = require('../templates/messageTemplates');

function makeUid(parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex');
}

async function processIfNew(row) {
  if (hasSeen(row.uid)) return false;
  const ok = await sendToChannel(formatMessage(row));
  if (ok) markSeen(row.uid);
  return ok;
}

async function fetchForexNews() {
  if (!config.finnhub.apiKey) {
    console.warn('[forexFetcher] FINNHUB_API_KEY missing, skipping');
    return;
  }
  const url = `${config.finnhub.baseUrl}/news?category=forex&token=${config.finnhub.apiKey}`;
  let sentCount = 0;
  try {
    const res = await fetch(url);
    const items = await res.json();
    for (const item of (items || []).slice(0, 15)) {
      const uid = makeUid(['forex', item.headline, item.datetime]);
      const sent = await processIfNew({
        category: 'forex',
        uid,
        symbol: null,
        title: item.headline,
        event_type: 'news',
        price: null,
        change_pct: null,
        extra_json: JSON.stringify({ summary: item.summary }),
        source: item.source,
        event_time: new Date(item.datetime * 1000).toISOString(),
      });
      if (sent) sentCount++;
    }
    upsertFetchLog('forex_news', `ok (${sentCount} sent)`);
  } catch (err) {
    console.error('[forexFetcher] news error:', err.message);
    upsertFetchLog('forex_news', 'error: ' + err.message);
  }
}

async function fetchEconomicCalendar() {
  if (!config.finnhub.apiKey) return;
  const url = `${config.finnhub.baseUrl}/calendar/economic?token=${config.finnhub.apiKey}`;
  let sentCount = 0;
  try {
    const res = await fetch(url);
    const data = await res.json();
    for (const ev of (data.economicCalendar || []).slice(0, 30)) {
      if (ev.impact !== 'high' && ev.impact !== 'medium') continue; // skip low-impact noise
      const uid = makeUid(['calendar', ev.event, ev.country, ev.time]);
      const sent = await processIfNew({
        category: 'calendar',
        uid,
        symbol: ev.country,
        title: ev.event,
        event_type: ev.impact,
        price: null,
        change_pct: null,
        extra_json: JSON.stringify({ actual: ev.actual, estimate: ev.estimate, prev: ev.prev, unit: ev.unit }),
        source: 'Finnhub Economic Calendar',
        event_time: ev.time,
      });
      if (sent) sentCount++;
    }
    upsertFetchLog('calendar', `ok (${sentCount} sent)`);
  } catch (err) {
    console.error('[forexFetcher] calendar error:', err.message);
    upsertFetchLog('calendar', 'error: ' + err.message);
  }
}

async function runForexFetch() {
  await fetchForexNews();
}

async function runCalendarFetch() {
  await fetchEconomicCalendar();
}

module.exports = { runForexFetch, runCalendarFetch };
