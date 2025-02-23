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
        user = await client.db(DB_NAME).collection("users").findOne(
            {_id: ObjectId.createFromHexString(uid)},
        );
        if(user == null){
            res.status(404).json({"error": "user doesn't exist"}); return;
        }
        userBalance = user.balance;

        // BACKEND CHECK
        if(userBalance < PRICE_FOR_A_PACKET){
            res.json({error: "insufficient balance"});
            res.status(402);
            return;
        }

        // GENERATION
        for(let i=0; i<SUPERCARD_PACKET_SIZE; i++){
            let id = crypto.randomInt(0, marvelCharacters.data.length);
            packet.push(marvelCharacters.data[id].id);
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
