// db/index.js
// MINIMAL cache: this is NOT a news archive. It only remembers which
// news items have already been sent (by a hash/uid), so the same news
// never gets pushed to Telegram twice. Nothing else is stored.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', '..', 'seen_cache.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS seen_news (
  uid       TEXT PRIMARY KEY,   -- hash of source+headline+time
  seen_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fetch_log (
  category        TEXT PRIMARY KEY,
  last_fetched_at TEXT,
  last_status     TEXT
);
`);

function hasSeen(uid) {
  const row = db.prepare(`SELECT 1 FROM seen_news WHERE uid = ?`).get(uid);
  return !!row;
}

function markSeen(uid) {
  db.prepare(`
    INSERT INTO seen_news (uid, seen_at) VALUES (?, datetime('now'))
    ON CONFLICT(uid) DO NOTHING
  `).run(uid);
}

// Housekeeping: delete seen-records older than 7 days so the table
// never grows unbounded. Safe because APIs don't resurface week-old
// items as "new" anyway.
function cleanupOldSeen() {
  db.prepare(`DELETE FROM seen_news WHERE seen_at < datetime('now', '-7 days')`).run();
}

function upsertFetchLog(category, status) {
  db.prepare(`
    INSERT INTO fetch_log (category, last_fetched_at, last_status)
    VALUES (?, datetime('now'), ?)
    ON CONFLICT(category) DO UPDATE SET last_fetched_at = datetime('now'), last_status = ?
  `).run(category, status, status);
}

function getAllFetchLogs() {
  return db.prepare(`SELECT * FROM fetch_log`).all();
}

module.exports = {
  hasSeen,
  markSeen,
  cleanupOldSeen,
  upsertFetchLog,
  getAllFetchLogs,
};
