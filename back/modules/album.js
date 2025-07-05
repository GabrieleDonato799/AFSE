const { app, client, DB_NAME } = require('./common.js');
const { ObjectId } = require('mongodb');

/**
 * Takes the user id and creates its album.
 * Does not return anything.
 * @param {string} uid
 */
async function createUserAlbum(uid){
    const hasAlbum = await client.db(DB_NAME).collection("albums").findOne({
        user_id: uid 
    });

    if(hasAlbum) return;

    const albumCreated = await client.db(DB_NAME).collection("albums").insertOne(
        {
            user_id: uid,
            supercards: []
        }
    );

    await client.db(DB_NAME).collection("users").updateOne(
        {_id: uid},
        {$set: {album_id: albumCreated.insertedId}}
    );
}

async function getUserAlbum(res, uid){
    const albumData = await client.db(DB_NAME).collection("albums").findOne({
        user_id: ObjectId.createFromHexString(uid) 
    });

    console.log(albumData);

    albumData.supercards.sort((a, b) => {return a < b ? -1 : (a == b ? 0 : 1)});
    
    res.json(albumData.supercards);
}

// album routes
app.get("/album/:uid", (req, res) => {
    const uid = req.params.uid;

    try{
        ObjectId.createFromHexString(uid);
    }catch(e){
        console.log(e);
        res.status(400);
        res.json({error: "missing uid"});
        return;
    }

    getUserAlbum(res, uid);
});

module.exports = { createUserAlbum };
