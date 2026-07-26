/**
 * Shared progress reporter for AJ portal games.
 * Posts GAME_LEVEL_REACHED to parent for Install & Level Unlock rewards.
 */
(function () {
  function gameIdFromQuery() {
    try {
      return new URLSearchParams(window.location.search).get('ajGameId') || '';
    } catch (e) {
      return '';
    }
  }

  window.ajReportLevel = function (level, gameId) {
    try {
      var id = gameId || gameIdFromQuery();
      var lvl = Math.floor(Number(level) || 0);
      if (!id || lvl < 1) return;
      if (window.AJ_SDK && typeof window.AJ_SDK.reportLevel === 'function') {
        window.AJ_SDK.reportLevel(id, lvl);
        return;
      }
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: 'GAME_LEVEL_REACHED', gameId: id, level: lvl },
          '*'
        );
      }
    } catch (e) {}
  };

  // Dedup rapid reports
  var last = { id: '', lvl: 0, t: 0 };
  window.ajReportLevelOnce = function (level, gameId) {
    var id = gameId || gameIdFromQuery();
    var lvl = Math.floor(Number(level) || 0);
    var now = Date.now();
    if (id === last.id && lvl === last.lvl && now - last.t < 2000) return;
    last = { id: id, lvl: lvl, t: now };
    window.ajReportLevel(lvl, id);
  };
})();
