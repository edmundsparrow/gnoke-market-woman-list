/**
 * db.js — Gnoke Market Woman List
 * SQL.js (WebAssembly SQLite) with localStorage binary persistence.
 * Pattern: load → use → save on every write (like old MS Word autosave).
 *
 * Tables:
 *   trips      — market trips / projects
 *   trip_items — line items per trip
 *   settings   — key/value store
 *
 * Public API:
 *   await DB.init()
 *   DB.getTrips()                    → Trip[]
 *   DB.getTrip(id)                   → Trip | null
 *   DB.saveTrip(trip)                → id
 *   DB.deleteTrip(id)                → void
 *   DB.getItems(tripId)              → Item[]
 *   DB.saveItem(item)                → id
 *   DB.deleteItem(id)                → void
 *   DB.toggleItem(id, checked)       → void
 *   DB.getSetting(key, def)          → string
 *   DB.setSetting(key, val)          → void
 *   DB.exportJSON()                  → string
 *   DB.importJSON(json)              → void
 *   DB.newId()                       → string
 */

const DB = (() => {
  const LS_KEY  = 'gnoke_market_db';
  let   _sql    = null;   // SQL.js namespace
  let   _db     = null;   // open Database instance

  /* ── Persistence: save binary to localStorage ── */
  function _persist() {
    try {
      const data   = _db.export();               // Uint8Array
      const base64 = btoa(String.fromCharCode(...data));
      localStorage.setItem(LS_KEY, base64);
    } catch (e) { console.warn('[DB] persist error', e); }
  }

  function _load() {
    const b64 = localStorage.getItem(LS_KEY);
    if (!b64) return null;
    try {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return bin;
    } catch { return null; }
  }

  /* ── Schema ── */
  function _migrate() {
    _db.run(`
      CREATE TABLE IF NOT EXISTS trips (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        budget     REAL DEFAULT 0,
        note       TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        status     TEXT DEFAULT 'open'
      );

      CREATE TABLE IF NOT EXISTS trip_items (
        id         TEXT PRIMARY KEY,
        trip_id    TEXT NOT NULL,
        label      TEXT NOT NULL,
        price      REAL DEFAULT 0,
        qty        REAL DEFAULT 1,
        unit       TEXT DEFAULT '',
        checked    INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY(trip_id) REFERENCES trips(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    _persist();
  }

  /* ── Init ── */
  async function init() {
    if (_db) return;

    // Load sql.js from CDN
    _sql = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    const saved = _load();
    if (saved) {
      _db = new _sql.Database(saved);
    } else {
      _db = new _sql.Database();
      _migrate();
    }
    // Ensure schema up to date even on existing DB
    _migrate();
  }

  /* ── Helpers ── */
  function _query(sql, params = []) {
    const stmt = _db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  function _run(sql, params = []) {
    _db.run(sql, params);
    _persist();
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ══ TRIPS ══ */
  function getTrips() {
    return _query(`SELECT * FROM trips ORDER BY created_at DESC`);
  }

  function getTrip(id) {
    const rows = _query(`SELECT * FROM trips WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  function saveTrip(trip) {
    const existing = getTrip(trip.id);
    if (existing) {
      _run(`UPDATE trips SET name=?, budget=?, note=?, status=? WHERE id=?`,
        [trip.name, trip.budget || 0, trip.note || '', trip.status || 'open', trip.id]);
    } else {
      const id = trip.id || newId();
      _run(`INSERT INTO trips (id, name, budget, note, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [id, trip.name, trip.budget || 0, trip.note || '', trip.created_at || new Date().toISOString(), trip.status || 'open']);
      return id;
    }
    return trip.id;
  }

  function deleteTrip(id) {
    _run(`DELETE FROM trip_items WHERE trip_id = ?`, [id]);
    _run(`DELETE FROM trips WHERE id = ?`, [id]);
  }

  /* ══ ITEMS ══ */
  function getItems(tripId) {
    return _query(`SELECT * FROM trip_items WHERE trip_id = ? ORDER BY sort_order, rowid`, [tripId]);
  }

  function saveItem(item) {
    const existing = _query(`SELECT id FROM trip_items WHERE id = ?`, [item.id])[0];
    if (existing) {
      _run(`UPDATE trip_items SET label=?, price=?, qty=?, unit=?, checked=?, sort_order=? WHERE id=?`,
        [item.label, item.price || 0, item.qty || 1, item.unit || '', item.checked ? 1 : 0, item.sort_order || 0, item.id]);
    } else {
      const id = item.id || newId();
      _run(`INSERT INTO trip_items (id, trip_id, label, price, qty, unit, checked, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, item.trip_id, item.label, item.price || 0, item.qty || 1, item.unit || '', item.checked ? 1 : 0, item.sort_order || 0]);
      return id;
    }
    return item.id;
  }

  function deleteItem(id) {
    _run(`DELETE FROM trip_items WHERE id = ?`, [id]);
  }

  function toggleItem(id, checked) {
    _run(`UPDATE trip_items SET checked = ? WHERE id = ?`, [checked ? 1 : 0, id]);
  }

  /* ══ SETTINGS ══ */
  function getSetting(key, def = '') {
    const rows = _query(`SELECT value FROM settings WHERE key = ?`, [key]);
    return rows[0] ? rows[0].value : def;
  }

  function setSetting(key, val) {
    _run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, String(val)]);
  }

  /* ══ EXPORT / IMPORT ══ */
  function exportJSON() {
    const trips = getTrips().map(t => ({ ...t, items: getItems(t.id) }));
    return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), trips }, null, 2);
  }

  function importJSON(json) {
    const data = JSON.parse(json);
    (data.trips || []).forEach(t => {
      const items = t.items || [];
      delete t.items;
      saveTrip(t);
      items.forEach(i => saveItem(i));
    });
  }

  return { init, newId, getTrips, getTrip, saveTrip, deleteTrip,
           getItems, saveItem, deleteItem, toggleItem,
           getSetting, setSetting, exportJSON, importJSON };
})();
