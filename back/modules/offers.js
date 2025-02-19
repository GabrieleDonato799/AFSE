/**
 * @module back/offers
 */

const { app, client, DB_NAME } = require('./common.js');
const { ObjectId } = require('mongodb');

async function getOffers(res){
    var offers = [];

    try{
        let response = client.db(DB_NAME).collection("offers").find();
        // console.log(offers);
        for await (let o of response){
            offers.push(o);
        }
        res.json({offers});
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
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
            console.log(`[buyOffer] albumLinked:${albumLinked}`);
        }else if(offer.type === "packets"){
            // check if user has sufficient balance --> 

            // update user balance
        }

        res.json({error: "success"});
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }
}

// offers for coins and supercards packets route
app.get("/offers", (req, res) => {
    getOffers(res);
});

app.post("/offers/buy/:uid", (req, res) => {
    var uid = req.params.uid;
    if(uid === undefined){
        res.status(400);
        res.json({error: "missing uid"});
        return;
    }
    buyOffer(req, res, uid);
});
