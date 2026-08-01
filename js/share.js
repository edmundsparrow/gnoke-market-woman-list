/**
 * share.js — Gnoke Market Woman List
 * Multi-select "share trips" feature. Kept in its own file (rather than
 * folded into app.js) so it can be debugged/extended in isolation.
 *
 * Read-only: this module only ever calls DB.getTrip()/DB.getItems() to
 * build a text summary. It never writes to the database, so it can't
 * affect anyone's stored trips or items.
 *
 * Public API (used by app.js):
 *   Share.isActive()          → bool, currently in select mode?
 *   Share.enter()             → turn on select mode
 *   Share.exit()              → turn off select mode, clear selection
 *   Share.toggle(id, checked) → select/deselect one trip id
 *   Share.isSelected(id)      → bool
 *   Share.shareSelected()     → build text + share/copy/download
 */
const Share = (() => {
  let active = false;
  const selected = new Set();

  const toolbar   = () => document.getElementById('share-toolbar');
  const countEl   = () => document.getElementById('share-count');
  const goBtn     = () => document.getElementById('btn-share-go');
  const tripsList = () => document.getElementById('trips-list');
  const newTripBtn = () => document.getElementById('btn-new-trip');

  function isActive() { return active; }
  function isSelected(id) { return selected.has(id); }

  function _updateToolbar() {
    const n = selected.size;
    if (countEl()) countEl().textContent = n === 0 ? 'Select trips to share' : `${n} selected`;
    if (goBtn()) goBtn().disabled = n === 0;
  }

  function enter() {
    active = true;
    selected.clear();
    tripsList()?.classList.add('select-mode');
    toolbar()?.classList.add('active');
    if (newTripBtn()) newTripBtn().style.display = 'none';
    _updateToolbar();
  }

  function exit() {
    active = false;
    selected.clear();
    tripsList()?.classList.remove('select-mode');
    toolbar()?.classList.remove('active');
    if (newTripBtn()) newTripBtn().style.display = '';
  }

  function toggle(id, checked) {
    if (checked === undefined) checked = !selected.has(id);
    if (checked) selected.add(id); else selected.delete(id);
    _updateToolbar();
  }

  /* ── Build a plain-text summary for one or more trips ── */
  function _buildText(ids) {
    const lines = [];
    ids.forEach((id, idx) => {
      const t = DB.getTrip(id);
      if (!t) return;
      const items = DB.getItems(id);
      const total = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseFloat(i.qty) || 1), 0);

      lines.push(`🛒 ${t.name}`);
      if (t.budget > 0) lines.push(`Budget: ${UI.fmt(t.budget)}`);
      items.forEach(i => {
        const mark  = i.checked ? '✅' : '⬜';
        const qty   = i.qty && Number(i.qty) !== 1 ? ` x${i.qty}${i.unit ? ' ' + i.unit : ''}` : (i.unit ? ` (${i.unit})` : '');
        const price = parseFloat(i.price) > 0 ? ` — ${UI.fmt(i.price * (i.qty || 1))}` : '';
        lines.push(`${mark} ${i.label}${qty}${price}`);
      });
      lines.push(`Total: ${UI.fmt(total)}`);
      if (idx < ids.length - 1) lines.push('');
    });
    lines.push('', '— via Gnoke Market Woman List');
    return lines.join('\n');
  }

  /* ── Share the current selection ──
     Tries the native share sheet first (best on mobile), then falls
     back to clipboard, then to a downloadable .txt as a last resort.
     Selection is left alone on cancel/failure so the user can retry. */
  async function shareSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const text = _buildText(ids);
    const title = ids.length === 1
      ? (DB.getTrip(ids[0])?.name || 'Market List')
      : `${ids.length} Market Lists`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        exit();
        return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return false; // user closed the share sheet
        console.warn('[share] navigator.share failed, falling back to clipboard', e);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        UI.toast('Copied to clipboard — paste to share.', 'ok');
        exit();
        return true;
      } catch (e) {
        console.warn('[share] clipboard write failed, falling back to download', e);
      }
    }

    // Last resort: downloadable text file (mirrors Settings → Export JSON)
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `market-list-share-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    UI.toast('Downloaded as text file.', 'ok');
    exit();
    return true;
  }

  return { isActive, isSelected, enter, exit, toggle, shareSelected };
})();
