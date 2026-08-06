// fetchers/cryptoFetcher.js
// News from CryptoPanic + notable price moves from CoinGecko.
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

async function fetchCryptoNews() {
  if (!config.cryptopanic.apiKey) {
    console.warn('[cryptoFetcher] CRYPTOPANIC_API_KEY missing, skipping');
    return;
  }
  const url = `${config.cryptopanic.baseUrl}/posts/?auth_token=${config.cryptopanic.apiKey}&filter=hot&public=true`;
  let sentCount = 0;
  try {
    const res = await fetch(url);
    const data = await res.json();
    for (const post of (data.results || []).slice(0, 15)) {
      const coin = post.currencies?.[0]?.code || 'GENERAL';
      const uid = makeUid(['crypto', post.id?.toString(), post.title]);
      const sent = await processIfNew({
        category: 'crypto',
        uid,
        symbol: coin,
        title: post.title,
        event_type: post.kind || 'news',
        price: null,
        change_pct: null,
        extra_json: JSON.stringify({ votes: post.votes }),
        source: post.source?.title || 'CryptoPanic',
        event_time: post.published_at,
      });
      if (sent) sentCount++;
    }
    upsertFetchLog('crypto_news', `ok (${sentCount} sent)`);
  } catch (err) {
    console.error('[cryptoFetcher] news error:', err.message);
    upsertFetchLog('crypto_news', 'error: ' + err.message);
  }
}

const COIN_WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'ripple'];

async function fetchCryptoPrices() {
  const ids = COIN_WATCHLIST.join(',');
  const url = `${config.coingecko.baseUrl}/coins/markets?vs_currency=usd&ids=${ids}`;
  let sentCount = 0;
  try {
    const res = await fetch(url);
    const coins = await res.json();
    for (const c of coins) {
      if (Math.abs(c.price_change_percentage_24h || 0) < 5) continue; // only notable moves
      const uid = makeUid(['crypto_move', c.id, new Date().toISOString().slice(0, 13)]); // hourly dedup
      const sent = await processIfNew({
        category: 'crypto',
        uid,
        symbol: c.symbol.toUpperCase(),
        title: `${c.name} big move: ${c.price_change_percentage_24h.toFixed(2)}% in 24h`,
        event_type: 'price_move',
        price: c.current_price,
        change_pct: c.price_change_percentage_24h.toFixed(2),
        extra_json: JSON.stringify({ market_cap: c.market_cap }),
        source: 'CoinGecko',
        event_time: new Date().toISOString(),
      });
      if (sent) sentCount++;
    }
    upsertFetchLog('crypto_price', `ok (${sentCount} sent)`);
  } catch (err) {
    console.error('[cryptoFetcher] price error:', err.message);
    upsertFetchLog('crypto_price', 'error: ' + err.message);
  }
}

async function runCryptoFetch() {
  await fetchCryptoNews();
  await fetchCryptoPrices();
}

module.exports = { runCryptoFetch };
