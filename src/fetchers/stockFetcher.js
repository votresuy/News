// fetchers/stockFetcher.js
// Pulls company news + IPO calendar (Finnhub) and MF NAV (mfapi.in).
// For each item: build a hash -> if NOT seen before -> format message
// -> send to Telegram -> mark as seen. No news is stored, only its hash.

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
  if (ok) markSeen(row.uid); // only mark seen if actually sent — retries on failure
  return ok;
}

const WATCHLIST = ['AAPL', 'MSFT', 'TSLA', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS'];

async function fetchCompanyNews() {
  if (!config.finnhub.apiKey) {
    console.warn('[stockFetcher] FINNHUB_API_KEY missing, skipping company news');
    return;
  }
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let sentCount = 0;
  for (const symbol of WATCHLIST) {
    const url = `${config.finnhub.baseUrl}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${config.finnhub.apiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const items = await res.json();
      for (const item of items.slice(0, 5)) {
        const uid = makeUid(['stock', symbol, item.headline, item.datetime]);
        const sent = await processIfNew({
          category: 'stock',
          uid,
          symbol,
          title: item.headline,
          event_type: item.category || 'news',
          price: null,
          change_pct: null,
          extra_json: JSON.stringify({ summary: item.summary }),
          source: item.source,
          event_time: new Date(item.datetime * 1000).toISOString(),
        });
        if (sent) sentCount++;
      }
    } catch (err) {
      console.error(`[stockFetcher] error fetching news for ${symbol}:`, err.message);
    }
  }
  upsertFetchLog('stock', `ok (${sentCount} sent)`);
}

async function fetchIpoCalendar() {
  if (!config.finnhub.apiKey) return;
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = `${config.finnhub.baseUrl}/calendar/ipo?from=${from}&to=${to}&token=${config.finnhub.apiKey}`;

  let sentCount = 0;
  try {
    const res = await fetch(url);
    const data = await res.json();
    for (const ipo of data.ipoCalendar || []) {
      const uid = makeUid(['ipo', ipo.symbol, ipo.date]);
      const sent = await processIfNew({
        category: 'stock',
        uid,
        symbol: ipo.symbol,
        title: `${ipo.name} IPO scheduled`,
        event_type: 'ipo',
        price: ipo.price || null,
        change_pct: null,
        extra_json: JSON.stringify({ exchange: ipo.exchange, shares: ipo.numberOfShares, status: ipo.status }),
        source: 'Finnhub IPO Calendar',
        event_time: ipo.date,
      });
      if (sent) sentCount++;
    }
    upsertFetchLog('ipo', `ok (${sentCount} sent)`);
  } catch (err) {
    console.error('[stockFetcher] IPO calendar error:', err.message);
    upsertFetchLog('ipo', 'error: ' + err.message);
  }
}

const MF_WATCHLIST = ['119528', '125497']; // example AMFI scheme codes

async function fetchMutualFundNav() {
  let sentCount = 0;
  for (const code of MF_WATCHLIST) {
    try {
      const res = await fetch(`${config.mfapi.baseUrl}/mf/${code}/latest`);
      const data = await res.json();
      const nav = data?.data?.[0];
      if (!nav) continue;
      const uid = makeUid(['mf', code, nav.date]);
      const sent = await processIfNew({
        category: 'stock',
        uid,
        symbol: data.meta.scheme_code?.toString(),
        title: `${data.meta.scheme_name} - NAV updated`,
        event_type: 'mutual_fund_nav',
        price: nav.nav,
        change_pct: null,
        extra_json: JSON.stringify({ fund_house: data.meta.fund_house, category: data.meta.scheme_category }),
        source: 'mfapi.in',
        event_time: nav.date,
      });
      if (sent) sentCount++;
    } catch (err) {
      console.error(`[stockFetcher] MF NAV error for ${code}:`, err.message);
    }
  }
  upsertFetchLog('mutual_fund', `ok (${sentCount} sent)`);
}

async function runStockFetch() {
  await fetchCompanyNews();
  await fetchIpoCalendar();
  await fetchMutualFundNav();
}

module.exports = { runStockFetch };
