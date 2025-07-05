/**
 * @module back/album
 */

const { app, client, DB_NAME } = require('./common.js');
const { getUser } = require('./user.js');
const { marvelCache } = require('./rarity.js');
const { ObjectId } = require('mongodb');

/**
 * Takes the server's response and the user's id, returns the user's album with the characters ordered by id.
 * @param {*} res 
 * @param {ObjectId} uid 
 */
async function getUserAlbum(res, uid){
    const albumData = await client.db(DB_NAME).collection("albums").findOne({
        user_id: ObjectId.createFromHexString(uid)
    });

    // console.log(albumData);
    
    if(albumData){
        albumData.collected = albumData.supercards.length;
        albumData.missing = [];
        marvelCache.characters.forEach(superhero => {
            albumData.missing.push(superhero.id);
        });
        albumData.missing = [...((new Set(albumData.missing)).difference(new Set(albumData.supercards)))];
        albumData.total = marvelCache.characters.length;
        res.json(albumData);
    }
    else{
        res.status(500).json({ error: "Missing album" });
    }
}

/**
 * Takes the server response, user id and character id of the card. Sells the card and returns the new user's balance.
 * @param {*} res 
 * @param {string} uid 
 * @param {string} cid 
 */
async function sellUserCard(res, uid, cids){
    // get the user and its album, check if they exist
    let user = await getUser(uid);
    if(!user) {
        res.status(500).json({error: "Couldn't retrieve the user"})
        return;
    }
    let album = await client.db(DB_NAME).collection("albums").findOne({
        user_id: ObjectId.createFromHexString(uid)
    });
    if(!album) return;

    // calculate the card' cost based on the rarity
    // let cost = ...;

    // console.log("Before");
    // console.log(user, album);

    // update the balance and remove the card
    for(let i=0; i<cids.length; i++){
        user.balance += 1;
        if(album.supercards.includes(cids[i])){
            let idx = album.supercards.indexOf(cids[i]);
            album.supercards.splice(idx, 1);
        }
        else{
            res.status(400).json({ error: "The user doesn't own a card he/she is trying to sell" });
            return;
        }
    }

    // update the user and the album
    const session = client.startSession();
    const transactionOptions = {
        writeConcern: { w: 'majority' },
    };
    const user_id = ObjectId.createFromHexString(uid);

    try {
        await session.withTransaction(async () => {
            const collAlbums = client.db(DB_NAME).collection('albums');
            const collUsers = client.db(DB_NAME).collection('users');
            await collAlbums.updateOne(
                { user_id: user_id },
                { $set: { supercards: album.supercards} },
                { session }
            );
            await collUsers.updateOne(
                { _id: user_id },
                { $set: { balance: user.balance } },
                { session }
            );
        }, transactionOptions);
        res.json({ error: "Success", balance: user.balance });
    }
    catch(e){
        console.log(e);
        res.status(500).json({error: "Failed to update the user's album and balance"});
    }
    finally {
        await session.endSession();
    }
}

// album routes
app.get("/album", (req, res) => {
    getUserAlbum(res, req.uid);
});

app.put("/album/sell", (req, res) => {
    sellUserCard(res, req.uid, req.body.cids);
});