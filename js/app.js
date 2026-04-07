/**
 * app.js — Gnoke Market Woman List
 * Bootstrap + event wiring.
 *
 * Pages:
 *   trips-page    → list of market trips
 *   list-page     → active trip item list
 *
 * Extending: add new page IDs to menu.js PAGES array.
 * The DB module exposes full SQL access for any new page.
 */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Boot ── */
  const loader = document.getElementById('app-loader');
  const appRoot = document.getElementById('app-root');

  try {
    await DB.init();
  } catch(e) {
    console.error('DB init failed', e);
    loader.innerHTML = `<p style="color:red">Failed to load database. Check connection.</p>`;
    return;
  }

  loader.style.display = 'none';
  appRoot.style.display = 'block';

  Theme.init();
  UI.init();

  /* ══ ROUTING ══ */
  function loadPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    State.set('activePage', pageId);
  }

  /* ══ TRIPS PAGE ══ */
  function renderTrips() {
    const list   = document.getElementById('trips-list');
    const empty  = document.getElementById('trips-empty');
    const trips  = DB.getTrips();

    if (trips.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = trips.map(t => {
      const items   = DB.getItems(t.id);
      const total   = items.length;
      const got     = items.filter(i => i.checked).length;
      const spent   = items.filter(i => i.checked).reduce((s, i) => s + (parseFloat(i.price)||0) * (parseFloat(i.qty)||1), 0);
      const planned = items.reduce((s, i) => s + (parseFloat(i.price)||0) * (parseFloat(i.qty)||1), 0);
      const pct     = total === 0 ? 0 : Math.round((got / total) * 100);
      const done    = pct === 100 && total > 0;
      const date    = new Date(t.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

      return `
        <div class="trip-card${done ? ' trip-card--done' : ''}" data-id="${t.id}">
          <div class="trip-card-top">
            <div class="trip-card-info">
              <div class="trip-card-name">${UI.escHtml(t.name)}</div>
              <div class="trip-card-meta">${date} · ${got}/${total} items</div>
            </div>
            <div class="trip-card-right">
              ${done ? `<span class="badge badge--done">✓ Done</span>` : `<span class="badge badge--pct">${pct}%</span>`}
              <button class="icon-btn-sm delete-trip-btn" data-id="${t.id}" title="Delete">🗑</button>
            </div>
          </div>
          <div class="trip-amounts">
            <span class="amount-label">Planned <strong>${UI.fmt(planned)}</strong></span>
            <span class="amount-sep">·</span>
            <span class="amount-label">Spent <strong class="spent">${UI.fmt(spent)}</strong></span>
            ${t.budget > 0 ? `<span class="amount-sep">·</span><span class="amount-label">Budget <strong>${UI.fmt(t.budget)}</strong></span>` : ''}
          </div>
          <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    list.querySelectorAll('.trip-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.delete-trip-btn')) return;
        openTrip(card.dataset.id);
      });
    });

    list.querySelectorAll('.delete-trip-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const t = DB.getTrip(btn.dataset.id);
        if (!confirm(`Delete "${t?.name}"? This cannot be undone.`)) return;
        DB.deleteTrip(btn.dataset.id);
        renderTrips();
        UI.toast('Trip deleted.', 'ok');
      });
    });
  }

  /* New trip modal */
  document.getElementById('btn-new-trip')?.addEventListener('click', () => {
    document.getElementById('new-trip-name').value = '';
    document.getElementById('new-trip-budget').value = '';
    document.getElementById('new-trip-note').value = '';
    UI.openModal('new-trip-modal');
    setTimeout(() => document.getElementById('new-trip-name')?.focus(), 80);
  });

  document.getElementById('btn-cancel-trip')?.addEventListener('click', () => UI.closeModal('new-trip-modal'));

  document.getElementById('btn-confirm-trip')?.addEventListener('click', () => {
    const name = document.getElementById('new-trip-name').value.trim();
    if (!name) { document.getElementById('new-trip-name').focus(); return; }
    const budget = parseFloat(document.getElementById('new-trip-budget').value) || 0;
    const note   = document.getElementById('new-trip-note').value.trim();
    const id = DB.newId();
    DB.saveTrip({ id, name, budget, note, created_at: new Date().toISOString(), status: 'open' });
    UI.closeModal('new-trip-modal');
    renderTrips();
    openTrip(id);
  });

  document.getElementById('new-trip-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-confirm-trip')?.click();
  });


  /* ══ LIST PAGE (active trip) ══ */
  function openTrip(id) {
    State.set('activeTripId', id);
    // Always start collapsed when entering a trip
    const body = document.getElementById('add-item-body');
    const btn  = document.getElementById('btn-toggle-add');
    if (body) body.classList.remove('open');
    if (btn)  btn.setAttribute('aria-expanded', 'false');
    renderList();
    loadPage('list-page');
  }

  document.getElementById('btn-back-to-trips')?.addEventListener('click', () => {
    State.set('activeTripId', null);
    renderTrips();
    loadPage('trips-page');
  });

  function renderList() {
    const id   = State.get('activeTripId');
    const trip = DB.getTrip(id);
    if (!trip) { loadPage('trips-page'); return; }

    const items   = DB.getItems(id);
    const total   = items.length;
    const got     = items.filter(i => i.checked).length;
    const spent   = items.filter(i => i.checked).reduce((s,i) => s + (parseFloat(i.price)||0)*(parseFloat(i.qty)||1), 0);
    const planned = items.reduce((s,i) => s + (parseFloat(i.price)||0)*(parseFloat(i.qty)||1), 0);
    const pct     = total === 0 ? 0 : Math.round((got/total)*100);

    /* Header */
    const dateStr = new Date(trip.created_at).toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    document.getElementById('list-title').textContent = trip.name;
    document.getElementById('list-sub').textContent   = dateStr + (trip.note ? ' · ' + trip.note : '');
    document.getElementById('list-pct').textContent   = pct + '%';
    document.getElementById('list-progress-fill').style.width = pct + '%';
    document.getElementById('list-summary').innerHTML = '';

    /* Items — table view */
    const listEl = document.getElementById('list-items');

    if (total === 0) {
      listEl.innerHTML = `<div class="list-empty">No items yet — tap "Add item" below.</div>`;
    } else {
      const renderRows = (arr) => arr.map(item => {
        const lineTotal = (parseFloat(item.price)||0) * (parseFloat(item.qty)||1);
        const qtyStr    = (parseFloat(item.qty)||1) !== 1 ? item.qty : '';
        return `
          <tr class="mkt-row${item.checked ? ' mkt-row--got' : ''}" data-id="${item.id}">
            <td class="mkt-td mkt-td--cb">
              <label class="list-cb-wrap">
                <input type="checkbox" class="item-cb" data-id="${item.id}" ${item.checked ? 'checked' : ''} />
                <span class="list-cb-custom"></span>
              </label>
            </td>
            <td class="mkt-td mkt-td--name">${UI.escHtml(item.label)}</td>
            <td class="mkt-td mkt-td--qty">${qtyStr}</td>
            <td class="mkt-td mkt-td--price">${lineTotal > 0 ? UI.fmt(lineTotal) : ''}</td>
            <td class="mkt-td mkt-td--actions">
              <button class="row-action-btn edit-item-btn" data-id="${item.id}" title="Edit">✏️</button>
              <button class="row-action-btn del-item-btn"  data-id="${item.id}" title="Remove">✕</button>
            </td>
          </tr>`;
      }).join('');

      const pendingRows = items.filter(i => !i.checked);
      const doneRows    = items.filter(i =>  i.checked);

      listEl.innerHTML = `
        <table class="mkt-table">
          <thead>
            <tr>
              <th class="mkt-th mkt-th--cb"></th>
              <th class="mkt-th mkt-th--name">Item</th>
              <th class="mkt-th mkt-th--qty">Qty</th>
              <th class="mkt-th mkt-th--price">Price</th>
              <th class="mkt-th mkt-th--actions"></th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(pendingRows)}
            ${doneRows.length > 0 ? `
              <tr class="mkt-divider-row">
                <td colspan="5"><span>✓ Got it (${doneRows.length})</span></td>
              </tr>
              ${renderRows(doneRows)}` : ''}
          </tbody>
          <tfoot>
            <tr class="mkt-total-row">
              <td colspan="3" class="mkt-total-label">Total</td>
              <td class="mkt-total-amt">${UI.fmt(planned)}</td>
              <td></td>
            </tr>
            ${spent > 0 && spent !== planned ? `
            <tr class="mkt-spent-row">
              <td colspan="3" class="mkt-total-label">Spent</td>
              <td class="mkt-total-amt mkt-total-amt--spent">${UI.fmt(spent)}</td>
              <td></td>
            </tr>` : ''}
            ${trip.budget > 0 ? `
            <tr class="mkt-budget-row${spent > trip.budget ? ' over-budget' : ''}">
              <td colspan="3" class="mkt-total-label">Budget</td>
              <td class="mkt-total-amt">${UI.fmt(trip.budget)}${spent > trip.budget ? ' ⚠️' : ''}</td>
              <td></td>
            </tr>` : ''}
          </tfoot>
        </table>`;

      /* Toggle */
      listEl.querySelectorAll('.item-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          DB.toggleItem(cb.dataset.id, cb.checked);
          renderList();
        });
      });

      /* Edit */
      listEl.querySelectorAll('.edit-item-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); openEditItem(btn.dataset.id); });
      });

      /* Delete */
      listEl.querySelectorAll('.del-item-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          DB.deleteItem(btn.dataset.id);
          renderList();
        });
      });
    }
  }

  /* ── Add item ── */
  document.getElementById('btn-toggle-add')?.addEventListener('click', () => {
    const body    = document.getElementById('add-item-body');
    const btn     = document.getElementById('btn-toggle-add');
    const open    = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !open);
    body.classList.toggle('open', !open);
    if (!open) setTimeout(() => document.getElementById('new-item-input')?.focus(), 220);
  });

  document.getElementById('btn-add-item')?.addEventListener('click', addItemFromInput);
  document.getElementById('new-item-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addItemFromInput();
  });

  function addItemFromInput() {
    const labelEl = document.getElementById('new-item-input');
    const priceEl = document.getElementById('new-item-price');
    const qtyEl   = document.getElementById('new-item-qty');

    const label = labelEl.value.trim();
    const price = parseFloat(priceEl.value);

    if (!label) {
      labelEl.focus();
      UI.toast('Item name is required.', 'err');
      return;
    }
    if (!price || price <= 0) {
      priceEl.focus();
      UI.toast('Price is required.', 'err');
      return;
    }

    const tripId = State.get('activeTripId');
    DB.saveItem({
      id: DB.newId(), trip_id: tripId,
      label,
      price,
      qty:   parseFloat(qtyEl.value) || 1,
      checked: 0, sort_order: Date.now(),
    });

    labelEl.value = ''; priceEl.value = ''; qtyEl.value = '';
    labelEl.focus();
    renderList();
  }

  /* ── Edit item modal ── */
  function openEditItem(itemId) {
    const items = DB.getItems(State.get('activeTripId'));
    const item  = items.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('edit-item-id').value    = item.id;
    document.getElementById('edit-item-label').value = item.label;
    document.getElementById('edit-item-price').value = item.price || '';
    document.getElementById('edit-item-qty').value   = item.qty   || 1;
    UI.openModal('edit-item-modal');
    setTimeout(() => document.getElementById('edit-item-label')?.focus(), 80);
  }

  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => UI.closeModal('edit-item-modal'));

  document.getElementById('btn-confirm-edit')?.addEventListener('click', () => {
    const id    = document.getElementById('edit-item-id').value;
    const label = document.getElementById('edit-item-label').value.trim();
    const price = parseFloat(document.getElementById('edit-item-price').value);

    if (!label) {
      document.getElementById('edit-item-label').focus();
      UI.toast('Item name is required.', 'err');
      return;
    }
    if (!price || price <= 0) {
      document.getElementById('edit-item-price').focus();
      UI.toast('Price is required.', 'err');
      return;
    }

    DB.saveItem({
      id, trip_id: State.get('activeTripId'),
      label,
      price,
      qty: parseFloat(document.getElementById('edit-item-qty').value) || 1,
    });
    UI.closeModal('edit-item-modal');
    renderList();
  });

  /* ── Reset / mark all ── */
  document.getElementById('btn-reset-list')?.addEventListener('click', () => {
    if (!confirm('Uncheck all items?')) return;
    const id = State.get('activeTripId');
    DB.getItems(id).forEach(i => DB.toggleItem(i.id, false));
    renderList();
    UI.toast('List reset.', 'ok');
  });


  /* ══ INIT ══ */
  renderTrips();
  loadPage('trips-page');

});
