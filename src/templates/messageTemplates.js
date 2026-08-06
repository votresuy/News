// templates/messageTemplates.js
// Fixed templates. No AI/LLM call anywhere here — just slot the cached
// DB row's fields into a pre-defined string. This is what keeps every
// Telegram message looking consistent.

function arrow(changePct) {
  if (changePct === null || changePct === undefined || changePct === '') return '';
  return parseFloat(changePct) >= 0 ? '🔺' : '🔻';
}

function trim(text, max = 160) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trim() + '…' : text;
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function stockTemplate(row) {
  const extra = JSON.parse(row.extra_json || '{}');
  const priceLine = row.price ? `💰 Price/NAV: ${row.price}` : '';
  return [
    `📊 STOCK/MF ALERT | ${row.symbol || 'N/A'}`,
    '━━━━━━━━━━━━━━━━',
    `📰 ${row.event_type.toUpperCase()}: ${trim(row.title)}`,
    priceLine,
    extra.summary ? `📌 ${trim(extra.summary, 200)}` : '',
    `⏰ ${formatTime(row.event_time)}`,
    `🔗 ${row.source}`,
    '━━━━━━━━━━━━━━━━',
  ].filter(Boolean).join('\n');
}

function cryptoTemplate(row) {
  const extra = JSON.parse(row.extra_json || '{}');
  const priceLine = row.price ? `💵 Price: $${row.price} (${row.change_pct}% ${arrow(row.change_pct)})` : '';
  return [
    `🪙 CRYPTO UPDATE | ${row.symbol || 'GENERAL'}`,
    '━━━━━━━━━━━━━━━━',
    priceLine,
    `📰 ${row.event_type.toUpperCase()}: ${trim(row.title)}`,
    `⏰ ${formatTime(row.event_time)}`,
    `🔗 ${row.source}`,
    '━━━━━━━━━━━━━━━━',
  ].filter(Boolean).join('\n');
}

function forexTemplate(row) {
  return [
    `💱 FOREX NEWS`,
    '━━━━━━━━━━━━━━━━',
    `📰 ${trim(row.title)}`,
    `⏰ ${formatTime(row.event_time)}`,
    `🔗 ${row.source}`,
    '━━━━━━━━━━━━━━━━',
  ].filter(Boolean).join('\n');
}

function calendarTemplate(row) {
  const extra = JSON.parse(row.extra_json || '{}');
  const impactIcon = row.event_type === 'high' ? '🔴 HIGH' : '🟡 MEDIUM';
  return [
    `🏛️ ECONOMIC CALENDAR | ${row.symbol || ''}`,
    '━━━━━━━━━━━━━━━━',
    `📌 Event: ${trim(row.title)}`,
    `⚡ Impact: ${impactIcon}`,
    extra.actual !== undefined ? `📊 Actual: ${extra.actual} | Forecast: ${extra.estimate} | Prev: ${extra.prev}` : '',
    `⏰ ${formatTime(row.event_time)}`,
    '━━━━━━━━━━━━━━━━',
  ].filter(Boolean).join('\n');
}

function formatMessage(row) {
  switch (row.category) {
    case 'stock': return stockTemplate(row);
    case 'crypto': return cryptoTemplate(row);
    case 'forex': return forexTemplate(row);
    case 'calendar': return calendarTemplate(row);
    default: return trim(row.title, 300);
  }
}

module.exports = { formatMessage };
