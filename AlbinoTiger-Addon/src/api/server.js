// AlbinoTiger-Addon/src/api/server.js
/**
 * Server communication and status checking
 */

async function checkServerStatus() {
    try {
      const response = await fetch(`${AT_CONFIG.SERVER_URL}/directory`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      const wasOnline = state.serverOnline;
      state.serverOnline = response.ok;
      if (state.serverOnline !== wasOnline) {
        console.log(`🐯 AlbinoTiger: Server ${state.serverOnline ? 'online' : 'offline'}`);
        updateFileSearchState();
      }
      return state.serverOnline;
    } catch (err) {
      const wasOnline = state.serverOnline;
      state.serverOnline = false;
      if (wasOnline) {
        console.log('🐯 AlbinoTiger: Server offline');
        updateFileSearchState();
      }
      return false;
    }
  }
  
  function startServerStatusChecking() {
    checkServerStatus();
    setInterval(checkServerStatus, AT_CONFIG.SERVER_CHECK_INTERVAL);
  }