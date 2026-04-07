/**
 * state.js — Gnoke Market
 * Runtime state. No persistence — DB handles that.
 */
const State = (() => {
  const DEFAULTS = {
    activePage  : 'trips-page',
    activeTripId: null,
  };
  let _s = { ...DEFAULTS };
  const _l = {};
  const get = k => _s[k];
  const set = (k, v) => { _s[k] = v; (_l[k] || []).forEach(fn => fn(v)); };
  const on  = (k, fn) => { if (!_l[k]) _l[k] = []; _l[k].push(fn); };
  const reset = () => { _s = { ...DEFAULTS }; };
  return { get, set, on, reset };
})();
