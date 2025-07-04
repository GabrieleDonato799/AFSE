/**
 * @module back/packets
 */

const { app, client, DB_NAME, SUPERCARD_PACKET_SIZE, PRICE_FOR_A_PACKET } = require('./common.js');
const { marvelCache } = require('./rarity.js');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

async function generatePacket(res, uid){
    let packet = [];
    let userBalance = 0; 
    
    // Atomically check the user's balance and update its album if it is not full
    const session = client.startSession();
    const transactionOptions = {
        writeConcern: { w: 'majority' },
    };
    const user_id = ObjectId.createFromHexString(uid);

    try {
        await session.withTransaction(async () => {
            const collAlbums = client.db(DB_NAME).collection('albums');
            const collUsers = client.db(DB_NAME).collection('users');
            const collTrades = client.db(DB_NAME).collection('trades');

            // Find the user
            const user = await collUsers.findOne(
                {_id: ObjectId.createFromHexString(uid)},
            );
            if(user == null){
                res.status(404).json({"error": "user doesn't exist"});
                session.abortTransaction(); return;
            }

            // Check that the user has enough balance
            if(user.balance < PRICE_FOR_A_PACKET){
                res.json({error: "insufficient balance"});
                res.status(402);
                session.abortTransaction(); return;
            }

            // Retrieves the user's album to generate only cards that are missing
            const album = await collAlbums.findOne(
                {user_id: ObjectId.createFromHexString(uid)},
            );

            // Get the user's trades, we don't want to give out cards xe owns but are being offered or wanted in an active trade.
            const trades = await collTrades.find(
                { $and: [
                        { offerer: ObjectId.createFromHexString(uid) },
                        { matched: { $ne: true } }
                    ]
                }
            ).toArray();
            let inTradeCards = [];
            for(t of trades){
                inTradeCards.push(t.offers);
                inTradeCards.push(t.wants);
            }
            inTradeCards = inTradeCards.flat();

            // Generate the packet, take all ids, remove owned cards ids and ids of cards locked in a trade, pick a random id from the result
            const allIds = new Set(marvelCache.characters.map(hero => hero.id));
            const ownedIds = new Set(album.supercards);
            const trading = new Set(inTradeCards);
            const diff = (allIds.difference(ownedIds)).difference(trading);

            if(diff.size == 0){
                res.status(409).json({error:"Your album is full or you are exchanging the missing ones, you can't buy anything else until you sell something!"});
                session.abortTransaction(); return;
            }

            for(let i=0; i<Math.min(SUPERCARD_PACKET_SIZE, diff.size); i++){
                let id = crypto.randomInt(0, diff.size);
                packet.push([...diff][id]);
            }
            
            // Updates the user's album document
            await collAlbums.updateOne(
                {user_id: ObjectId.createFromHexString(uid)},
                {$addToSet: {supercards: {$each: packet}}}
            );

            // Update the user document
            await collUsers.updateOne(
                {_id: ObjectId.createFromHexString(uid)},
                {$inc: {balance: -1}}
            );
        
            res.json(packet);
        }, transactionOptions);
    }
    catch(e){
        console.error(e);
        if(!res.headersSent)
            res.status(500).json({error: "Failed to update the user's album and balance"});
    }
    finally {
        await session.endSession();
    }
}

// packets routes
app.get("/packets", (req, res) =>{
    if(!marvelCache.ready_characters){
        res.json({error: "The server is still loading the required resources"});
    }
    else{		
        generatePacket(res, req.uid);
    }
});
