/**
 * theme.js — Gnoke Market
 */
const Theme = (() => {
  const KEY = 'gnoke_market_theme';
  const cur = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const apply = t => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    syncIcon(t);
  };
  const syncIcon = t => {
    document.querySelectorAll('.theme-toggle-btn').forEach(b => b.textContent = t === 'dark' ? '☀️' : '🌙');
  };
  const toggle = () => apply(cur() === 'dark' ? 'light' : 'dark');
  const init   = () => {
    const saved = localStorage.getItem(KEY);
    if (saved) apply(saved);
    else syncIcon(cur());
    document.querySelectorAll('.theme-toggle-btn').forEach(b => b.addEventListener('click', toggle));
  };
  return { init, toggle, current: cur };
})();
