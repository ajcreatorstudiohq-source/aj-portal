import { NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig'; 
import { doc, updateDoc, increment } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log("💰 Notification Received:", body);

        // Jab NowPayments bole ke payment 'finished' hai
        if (body.payment_status === 'finished') {
            const userId = body.order_id; 
            const payAmount = parseFloat(body.price_amount); 
            
            // 1 OMR = 200 Coins Logic
            const coinsToAdd = Math.floor(payAmount * 200); 

            const userRef = doc(db, "users", userId);
            
            // Automatic Firebase update
            await updateDoc(userRef, {
                earnedBalance: increment(coinsToAdd)
            });

            console.log(`✅ Success: ${coinsToAdd} coins added to ${userId}`);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("❌ Error processing payment:", error);
        return NextResponse.json({ error: "Fail" }, { status: 500 });
    }
}