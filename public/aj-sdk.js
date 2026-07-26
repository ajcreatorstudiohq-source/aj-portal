// AJ SUPER PORTAL SDK — Games bridge
// Local tokens stay in-game. Wallet credits ONLY via verified milestones / offerwall APIs.
window.AJ_SDK = {
    directLink: "https://omg10.com/4/11280173",

    showAd: function() {
        try {
            if (typeof window.parent !== 'undefined' && window.parent !== window) {
                window.parent.postMessage({ type: 'GAME_SHOW_AD' }, '*');
            }
        } catch (e) {
            console.log('SDK: showAd (local only)');
        }
    },

    // NO-OP — never credit portal wallet from raw scores
    sendScore: function(_points) {
        console.log('SDK: sendScore ignored — use reportLevel for milestones');
    },

    // NO-OP — never sync local banks to wallet
    addBalance: function(_data) {
        console.log('SDK: addBalance ignored — no portal wallet sync from games');
    },

    /**
     * Report a reached level to the parent portal.
     * Parent validates install + milestone via /api/games/milestone.
     */
    reportLevel: function(gameId, level) {
        try {
            var id = gameId || (new URLSearchParams(window.location.search).get('ajGameId')) || '';
            var lvl = Math.floor(Number(level) || 0);
            if (!id || lvl < 1) return;
            if (typeof window.parent !== 'undefined' && window.parent !== window) {
                window.parent.postMessage({
                    type: 'GAME_LEVEL_REACHED',
                    gameId: id,
                    level: lvl
                }, '*');
            }
        } catch (e) {
            console.warn('SDK: reportLevel failed', e);
        }
    }
};

// Convenience global for game HTML
window.ajReportLevel = function(level, gameId) {
    if (window.AJ_SDK && window.AJ_SDK.reportLevel) {
        window.AJ_SDK.reportLevel(gameId, level);
    }
};
