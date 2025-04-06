/**
 * @module back/packets
 */

const { app, client, DB_NAME, SUPERCARD_PACKET_SIZE, PRICE_FOR_A_PACKET } = require('./common.js');
var { marvelCharacters } = require('./rarity.js');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

async function generatePacket(res, uid){
    let packet = [];
    let userBalance = 0; 
    
    // TODO: Atomically check the user's balance and update its album if it is not full
    try{
        // retrieves the user balance
        // FIND
        const user = await client.db(DB_NAME).collection("users").findOne(
            {_id: ObjectId.createFromHexString(uid)},
        );
        if(user == null){
            res.status(404).json({"error": "user doesn't exist"}); return;
        }

        // BACKEND CHECK
        if(user.balance < PRICE_FOR_A_PACKET){
            res.json({error: "insufficient balance"});
            res.status(402);
            return;
        }

        // retrieves the user album to generate only cards that are missing
        const album = await client.db(DB_NAME).collection("albums").findOne(
            {user_id: ObjectId.createFromHexString(uid)},
        );

        // GENERATION
        // take all ids, remove owned cards ids, pick a random id from the result
        const allIds = new Set(marvelCharacters.data.map(hero => hero.id));
        const ownedIds = new Set(album.supercards);
        const diff = allIds.difference(ownedIds);

        for(let i=0; i<Math.min(SUPERCARD_PACKET_SIZE, diff.size); i++){
            let id = crypto.randomInt(0, diff.size);
            packet.push([...diff][id]);
        }
        
        // UPDATE DOCUMENT IN A DIFFERENT COLLECTION
        // Updates the user album
        console.log(await client.db(DB_NAME).collection("albums").updateOne(
            {user_id: ObjectId.createFromHexString(uid)},
            {$addToSet: {supercards: {$each: packet}}}
        ));

        // UPDATE
        console.log(await client.db(DB_NAME).collection("users").updateOne(
            {_id: ObjectId.createFromHexString(uid)},
            {$inc: {balance: -1}}
        ));
    
        res.json(packet);
    }catch(e){
        console.log(e);
    }
}

// packets routes
app.get("/packets", (req, res) =>{
    if(!marvelCharacters.ready){
        res.json({error: "The server is still loading the required resources"});
    }
    else{		
        generatePacket(res, req.uid);
    }
});
