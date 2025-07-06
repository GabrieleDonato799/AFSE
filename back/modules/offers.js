/**
 * @module back/modules/offers
 * @description Contains the endpoints to retrieve and buy offers.
 */

const { app, client, DB_NAME } = require('./common.js');
const { ObjectId } = require('mongodb');

async function getOffers(res){
    let offers = [];

    try{
        let response = client.db(DB_NAME).collection("offers").find();
        // console.log(offers);
        for await (let o of response){
            offers.push(o);
        }
        res.json({offers});
    }catch(e){
        console.error(e);
    }
}

async function buyOffer(req, res, uid){
    const id = req.body.id;

    try{
        // retrieve the corresponding offer
        let offer = await client.db(DB_NAME).collection("offers").findOne(
            {_id: ObjectId.createFromHexString(id)}
        );
        console.log(offer);

        // TODO: Atomically check the user's balance and update it accordingly
        if(offer.type === "coins"){
            const albumLinked = await client.db(DB_NAME).collection("users").updateOne(
                {_id: ObjectId.createFromHexString(uid)},
                {$inc: {balance: offer.amount}}
            );
            console.log(`[buyOffer] albumLinked:${albumLinked.modifiedCount}`);
        }else if(offer.type === "packets"){
            // check if user has sufficient balance --> 

            // update user balance
        }

        res.json({error: "success"});
    }catch(e){
        console.error(e);
    }
}

// offers for coins and supercards packets route
app.get("/offers", (req, res) => {
    getOffers(res);
});

app.post("/offers/buy", (req, res) => {
    buyOffer(req, res, req.uid);
});
