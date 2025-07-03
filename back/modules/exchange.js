/**
 * @module back/exchange
 */

const { app, client, DB_NAME } = require('./common.js');
const { ObjectId } = require('mongodb');
const { getMarvelCharacterById } = require('./rarity.js');

async function createTrade(req, res){
    const offerer = req.body.offerer;
    // const wanter = req.body.wanter;
    const offers = req.body.offers;
    const wants = req.body.wants;

    let trade = undefined;

    try{
        trade = {
            offerer: ObjectId.createFromHexString(offerer),
            wanter: null,
            offers: offers,
            wants: wants
        };

        await client.db(DB_NAME).collection("trades").insertOne(trade);
        
        res.json({error: "success"});
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }

    // try to automatically match the trade
    if(trade !== undefined)
        await matchTrade(trade);

    return res;
}

async function getTrades(req, res, uid){
    let trades = [];

    try{
        let response = await client.db(DB_NAME).collection("trades").find(
            {
                $or: [{offerer: ObjectId.createFromHexString(uid)}, {wanter: ObjectId.createFromHexString(uid)}]
            }
        );
        for await (let t of response){
            t.offers_names = [];
            t.wants_names = [];

            // add names to the characters to be displayed
            for(let char_id of t.offers){
                let hero = await getMarvelCharacterById(char_id);
                t.offers_names.push(hero.name);
            }
            for(let char_id of t.wants){
                let hero = await getMarvelCharacterById(char_id);
                t.wants_names.push(hero.name);
            }

            trades.push(t);
        }

        res.json(trades);
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }
}

async function matchTrade(trade){
    let trades = [];

    try{
        let response = await client.db(DB_NAME).collection("trades").find(
            {
                offers: {$all: [...trade.wants]},
            }
        );
        for await (let t of response){
            trades.push(t);
        }
        // console.log(trades);
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }
}

// exchange route
app.post("/exchange/trade", (req, res) => {
    createTrade(req, res);
});

app.get("/exchange/trades", (req, res) => {
    getTrades(req, res, req.uid);
});
