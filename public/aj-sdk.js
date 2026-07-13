// ==========================================
// AJ SOVEREIGN SDK v1.1 - Profit Engine
// ==========================================

const AJ_SDK = {
    init: function() {
        console.log("AJ SDK: Engine Connected...");
    },

    // Jab Ad khatam ho (Maano $0.10 ka ad tha)
    rewardAfterAd: function(adValueUSD) {
        const userShare = 0.30; // 30% User ka
        const aliShare = 0.70;  // 70% Ali ka
        
        // 100 Coins = $1.00 USD
        const userRewardCoins = (adValueUSD * userShare) * 100;
        const aliProfitUSD = adValueUSD * aliShare;

        window.parent.postMessage({
            type: "ADD_AD_REVENUE",
            coins: userRewardCoins,
            profit: aliProfitUSD
        }, "*");
    },

    // Game points ko coins mein badalna (100:1)
    syncGamePoints: function(points) {
        const coinsToGive = Math.floor(points / 100);
        if (coinsToGive > 0) {
            window.parent.postMessage({
                type: "SYNC_GAME_COINS",
                coins: coinsToGive
            }, "*");
        }
    }
};

AJ_SDK.init();