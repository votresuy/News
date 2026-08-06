require('dotenv').config();

module.exports = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    channelId: process.env.TELEGRAM_CHANNEL_ID,
  },
  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY,
    baseUrl: 'https://finnhub.io/api/v1',
  },
  cryptopanic: {
    apiKey: process.env.CRYPTOPANIC_API_KEY,
    baseUrl: 'https://cryptopanic.com/api/v1',
  },
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
  },
  mfapi: {
    baseUrl: 'https://api.mfapi.in',
  },
  intervals: {
    stockMinutes: parseInt(process.env.STOCK_POLL_INTERVAL || '5', 10),
    cryptoMinutes: parseInt(process.env.CRYPTO_POLL_INTERVAL || '3', 10),
    forexMinutes: parseInt(process.env.FOREX_POLL_INTERVAL || '15', 10),
    calendarMinutes: parseInt(process.env.CALENDAR_POLL_INTERVAL || '30', 10),
  },
  port: parseInt(process.env.PORT || '4000', 10),
};
