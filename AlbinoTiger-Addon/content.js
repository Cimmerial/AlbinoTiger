// AlbinoTiger-Addon/content.js
/**
 * AlbinoTiger v0.6.0
 * Main entry point - orchestrates initialization
 */

(function () {
  console.log('🐯 AlbinoTiger: Extension loaded');

  function injectUI() {
    console.log('🐯 AlbinoTiger: Injecting UI');

    // Inject styles
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = AT_STYLES;
    document.head.appendChild(styleSheet);

    // Inject HTML
    document.body.insertAdjacentHTML('beforeend', AT_MODAL_HTML);
    console.log('🐯 AlbinoTiger: UI injected');
  }

  async function initialize() {
    console.log('🐯 AlbinoTiger: Initializing...');
    await loadState();
    injectUI();
    updateAllUI();
    addListeners();
    startServerStatusChecking();
    console.log('🐯 AlbinoTiger: ✓ Initialization complete');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initialize();
  } else {
    window.addEventListener('DOMContentLoaded', initialize);
  }
})();