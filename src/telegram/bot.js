// telegram/bot.js
// Just a thin wrapper to send one message to the channel.
// Fetchers call sendToChannel() directly, right after confirming
// (via hasSeen/markSeen) that a news item is new.

const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

let bot = null;
function getBot() {
  if (!bot) {
    if (!config.telegram.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not set in .env');
    }
    bot = new TelegramBot(config.telegram.botToken, { polling: false });
  }
  return bot;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToChannel(message) {
  const b = getBot();
  try {
    await b.sendMessage(config.telegram.channelId, message);
    await sleep(1200); // gentle pacing so Telegram rate limits aren't hit
    return true;
  } catch (err) {
    console.error('[telegram] send failed:', err.message);
    return false;
  }
}

module.exports = { sendToChannel };
