/**
 * @module back/exchange
 */

const { app, client, DB_NAME } = require('./common.js');
const { ObjectId } = require('mongodb');

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
