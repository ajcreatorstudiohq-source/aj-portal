// AJ SUPER PORTAL SDK — Games entertainment bridge (NO wallet / cash credit)
// In-game tokens stay local. Real AJ Coins come from posts, gifts, live & referrals only.
window.AJ_SDK = {
    directLink: "https://omg10.com/4/11280173",

    // Optional interstitial helper (games may call this on transitions)
    showAd: function() {
        try {
            if (typeof window.parent !== 'undefined' && window.parent !== window) {
                window.parent.postMessage({ type: 'GAME_SHOW_AD' }, '*');
            }
        } catch (e) {
            console.log('SDK: showAd (local only)');
        }
    },

    // NO-OP — games must never credit portal wallet / cash-out
    sendScore: function(_points) {
        console.log('SDK: sendScore ignored — games do not credit AJ Coins');
    },

    // NO-OP — local game banks stay inside each game only
    addBalance: function(_data) {
        console.log('SDK: addBalance ignored — no portal wallet sync from games');
    }
};
