# Market News Backend (minimal duplicate-check DB)

Stock/MF/ETF/IPO + Crypto + Forex/Economic-Calendar news, formatted
with fixed templates (no AI) and pushed straight to a Telegram
channel — continuously, 24x7.

## How it works

```
[Cron scheduler] --(every N min)--> [External APIs]
                                          |
                                for each news item:
                                          |
                          is its hash already in seen_cache.db?
                                 /                    \
                              YES                      NO
                        (skip, don't resend)     format -> send to
                                                  Telegram -> mark
                                                  hash as seen
```

There is **no news archive** — the DB only stores a small hash per
item (`seen_news` table) so the same headline never gets sent twice.
Old hashes auto-delete after 7 days to keep the file small.

## Setup

```bash
cd news-backend
npm install
cp .env.example .env
# edit .env: Telegram bot token, channel id, Finnhub key, CryptoPanic key
npm start
```

## Free API keys needed

- **Telegram bot token**: @BotFather on Telegram → `/newbot`
- **Finnhub** (stocks, IPO calendar, forex news, economic calendar):
  https://finnhub.io/register
- **CryptoPanic** (crypto news): https://cryptopanic.com/developers/api/
- **mfapi.in** (Indian mutual fund NAV): no key needed
- **CoinGecko** (crypto prices): no key needed for basic tier

## Endpoints

- `GET /health` — up-check (also used to keep the Render free instance awake)
- `GET /status` — last fetch time + count sent per category

## Deploying on Render (24x7)

1. Push this project to a GitHub repo (`.env` is git-ignored — don't commit it)
2. Render dashboard → **New +** → **Web Service** → connect your repo
3. Build command: `npm install`   |   Start command: `npm start`
4. Add all the `.env` variables under Render's **Environment** tab
5. Deploy

Free tier note: Render sleeps a service after ~15 min of no HTTP
traffic, which would pause the cron jobs. Fix: add a free
[UptimeRobot](https://uptimerobot.com) monitor pinging
`https://your-app.onrender.com/health` every 5 minutes — this keeps
the service awake so news keeps flowing continuously.

Also note: the free tier's disk isn't permanent, so `seen_cache.db`
may reset on redeploy — a few already-sent items could repeat once
after a redeploy. This is expected and accepted for this setup.

## Customizing

- Stock tickers: `WATCHLIST` in `src/fetchers/stockFetcher.js`
- MF scheme codes: `MF_WATCHLIST` in the same file
- Crypto coins tracked: `COIN_WATCHLIST` in `src/fetchers/cryptoFetcher.js`
- Message look/format: `src/templates/messageTemplates.js` (plain strings, no AI)
- Poll intervals: `.env` — `STOCK_POLL_INTERVAL`, `CRYPTO_POLL_INTERVAL`,
  `FOREX_POLL_INTERVAL`, `CALENDAR_POLL_INTERVAL` (minutes)
