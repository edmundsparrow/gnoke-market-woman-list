/* sw-update.js — shared service worker registration + manual update.
 *
 * Registers sw.js once (root scope, so it covers every page). Updates
 * are deliberately NOT automatic: a new sw.js installs and sits
 * "waiting" until GnokeSW.forceUpdate() is called (wired to the
 * Update button in Settings). This never touches app data — trips and
 * items live in localStorage via SQL.js, completely separate from the
 * service worker's cache.
 */
window.GnokeSW = (function () {
  let _reg = null;

  // Works out the site root from this script's own <script src>, so
  // registration resolves correctly whether this is included as
  // 'js/sw-update.js' (root pages) or '../js/sw-update.js' (main/ pages).
  const _scriptSrc = document.currentScript && document.currentScript.src;
  const _root = _scriptSrc
    ? _scriptSrc.replace(/js\/sw-update\.js(\?.*)?$/, '')
    : './';

  function register() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(_root + 'sw.js')
        .then((reg) => { _reg = reg; })
        .catch(() => {});
    });

    // Fires once the waiting worker takes over (after forceUpdate()
    // posts SKIP_WAITING) — reload so the new files are actually used.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }

  // Checks the network for a new sw.js; if one is already installed
  // and waiting, tells it to activate. Returns true if an update was
  // found and applied (a reload will follow shortly), false if the
  // app was already up to date.
  async function forceUpdate() {
    if (!('serviceWorker' in navigator)) return false;
    const reg = _reg || (await navigator.serviceWorker.getRegistration());
    if (!reg) return false;

    await reg.update().catch(() => {});
    if (reg.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
      return true;
    }
    return false;
  }

  return { register, forceUpdate };
})();
