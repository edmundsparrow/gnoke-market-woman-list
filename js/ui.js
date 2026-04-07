/**
 * ui.js — Gnoke Market
 */
const UI = (() => {
  let _tt = null;

  const toast = (msg, type = 'info') => {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(_tt);
    el.textContent = msg;
    el.className = `show${type === 'err' ? ' err' : type === 'ok' ? ' ok' : ''}`;
    _tt = setTimeout(() => el.classList.remove('show'), 2800);
  };

  const openModal  = id => document.getElementById(id)?.classList.add('show');
  const closeModal = id => document.getElementById(id)?.classList.remove('show');

  const fmt = (n) => {
    const num = parseFloat(n) || 0;
    return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const escHtml = str => String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const init = () => {
    document.querySelectorAll('.modal-overlay').forEach(o => {
      o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); });
    });
  };

  return { toast, openModal, closeModal, fmt, escHtml, init };
})();
