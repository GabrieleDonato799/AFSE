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
    const session = client.startSession();
    const transactionOptions = {
        writeConcern: { w: 'majority' },
    };
    const offerer_objid = ObjectId.createFromHexString(offerer);

    // atomically delete the card from the user and create a trade
    try {
        trade = {
            offerer: offerer_objid,
            wanter: null,
            offers: offers,
            wants: wants
        };

        await session.withTransaction(async () => {
            const collAlbums = client.db(DB_NAME).collection('albums');
            const collTrades = client.db(DB_NAME).collection('trades');

            // NOTE: the user can't offer the same card twice because it is removed from his album when a trade is created

            // "find all the album of the user if xe has all the cards he is offering"
            // this checks if the user has the cards he claims to have
            let possessedCards = await collAlbums.findOne(
                {
                    $and: [
                        { user_id: offerer_objid },
                        { supercards: { $all: [...offers] } }
                    ]
                }
            );
            
            if(possessedCards == null){
                throw new Error("The user doesn't have the cards xe is trying to exchange.");
            }
            
            // check if the user has the cards he asks for
            possessedCards = possessedCards.supercards;
            for(let w of wants){
                if(possessedCards.includes(w)){
                    throw new Error("The user can't ask for cards xe owns.");
                }
            }
            
            // check if the user doesn't want a card he already asked for
            let activeTrades = await collTrades.find(
                {
                    $and: [
                        { offerer: offerer_objid },
                        { wants: { $in: wants } }
                    ]
                }
            ).toArray();
            if(activeTrades.length > 0){
                throw new Error("The user can't ask for a card xe already asked for, blocked in an active trade.");
            }
            await collAlbums.updateOne(
                { user_id: offerer_objid },
                { $pull: { supercards: { $in: [...offers] } } },
                { session }
            );
            await collTrades.insertOne(trade);
        }, transactionOptions);

        // try to automatically match the trade
        if(trade !== undefined){
            matchTrade(trade);
            res.json({error: "Successfully created!"});
        }
        else{
            res.status(500).json({error: "An error occured please try later..."});
        }
    }
    catch(e){
        console.log(e);
        res.status(400).json({error: `${e.message}`});
    }
    finally {
        await session.endSession();
    }

    return res;
}

/**
 * Takes a request with the trade id in the querystring and tries to delete that trade.
 * A trade can only be deleted from the user that created it.
 * Returns JSON formatted errors in the response.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
async function deleteTrade(req, res){
    const tradeId = ObjectId.createFromHexString(req.params.id);
    const userId = ObjectId.createFromHexString(req.uid);
    console.log(tradeId);

    const session = client.startSession();
    const transactionOptions = {
        writeConcern: { w: 'majority' },
    };

    try {
        await session.withTransaction(async () => {
            const collTrades = client.db(DB_NAME).collection('trades');
            const collAlbums = client.db(DB_NAME).collection('albums');

            // get the affected offered cards
            let trade = await collTrades.findOne(
                { $and: [
                    { offerer: userId },
                    { _id: tradeId }
                ] }
            );

            // give the offered cards back to the user
            let updateStatus = await collAlbums.updateOne(
                { user_id: userId },
                { $addToSet: { supercards: { $each : trade.offers } } }
            );

            let deleteStatus = await collTrades.deleteOne(
                { $and: [
                    { offerer: userId },
                    { _id: tradeId }
                ] }
            );
            
            if(deleteStatus.deletedCount === 0 || updateStatus.modifiedCount === 0){
                res.status(500).json({error: "Could not delete the trade"});
                throw Error(`Invalid transaction status: #deleted: ${deleteStatus.deletedCount}, #modified: ${updateStatus.modifiedCount}`);
            }
        }, transactionOptions);
    }
    catch(e){
        console.log(e);
    }
    finally{
        await session.endSession();
    }

    if(!res.headersSent)
        res.json({error: `Successfully deleted the trade`});

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
        console.log(e);
    }
}

async function matchTrade(t1){
    const session = client.startSession();
    const transactionOptions = {
        writeConcern: { w: 'majority' },
    };
    // const user_id = ObjectId.createFromHexString(uid);

    try {
        await session.withTransaction(async () => {
            const collAlbums = client.db(DB_NAME).collection('albums');
            const collTrades = client.db(DB_NAME).collection('trades');
            // Find all the trades of a different user (the offerer of t1) with exactly the opposite offers and wants. 
            let t2Crs = await collTrades.find(
                { $and: [
                    { wants: { $eq: t1.offers } },
                    { offers: { $eq: t1.wants } },
                    { offerer: { $ne: t1.offerer } }
                    // I don't check if the wanter is the user itself that offers, this integrity check must be enforced before creating the trade
                ] }
            ).toArray();
            console.log("t1", t1);
            if(t2Crs.length > 0){
                let t2 = t2Crs[0];
                console.log(t2);
                /** NOTES: Some integrity contrains are (look in the project docs for more)
                 * - that the user can't exchange cards with the same ones, can't get cards xe owns
                 * - offers are removed from the offerer by the createTrade() function
                 * - when the user create a trade the offered cards are removed from its album
                 */
                await collAlbums.updateOne(
                    { user_id: t2.offerer },
                    { $addToSet: { supercards: { $each: t1.offers } } }
                )
                await collAlbums.updateOne(
                    { user_id: t1.offerer },
                    { $addToSet: { supercards: { $each: t2.offers } } }
                )
            }
        }, transactionOptions);
    }
    catch(e){
        console.error("Couldn't match the trade: ", t1, "; Error: ", e);
    }
    finally {
        await session.endSession();
    }
}

// exchange route
app.post("/exchange/trade", (req, res) => {
    createTrade(req, res);
});

app.delete("/exchange/trade/:id", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    deleteTrade(req, res);
});

app.get("/exchange/trades", (req, res) => {
    getTrades(req, res, req.uid);
});
