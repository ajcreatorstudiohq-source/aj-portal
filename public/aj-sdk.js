// AJ SUPER PORTAL SDK - The Sovereign Money Machine
window.AJ_SDK = {
    // 1. Tumhara Monetag Direct Link
    directLink: "https://omg10.com/4/11280173", 

    // 2. Ad trigger function
    showAd: function() {
        console.log("SDK: Opening Ad Link...");
        // User ko new tab mein ad dikhayega
        window.open(this.directLink, '_blank');
    },

    // 3. Game Coins ko Portal Wallet mein bhejna (100:1 Ratio)
    sendScore: function(points) {
        const ajCoins = Math.floor(points / 100);
        if (ajCoins > 0) {
            console.log(`CEO Sync: Sending ${ajCoins} AJ Coins to Portal`);
            
            // Ye event Portal (Next.js) ko signal bhejega
            const event = new CustomEvent('updateFirebaseBalance', { 
                detail: { amount: ajCoins, type: 'EARNED' } 
            });
            window.parent.dispatchEvent(event);
        }
    }
};