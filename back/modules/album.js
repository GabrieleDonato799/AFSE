const { app, client, DB_NAME } = require('./common.js');
const { ObjectId } = require('mongodb');


async function createUserAlbum(uid){
    const mConn = await client.connect();
    const hasAlbum = await mConn.db(DB_NAME).collection("albums").findOne({
        user_id: uid 
    });

    if(hasAlbum) return;

    const albumCreated = await mConn.db(DB_NAME).collection("albums").insertOne(
        {
            user_id: uid,
            supercards: []
        }
    );

    await mConn.db(DB_NAME).collection("users").updateOne(
        {_id: uid},
        {$set: {album_id: albumCreated.insertedId}}
    );

    await mConn.close();
}

async function getUserAlbum(res, uid){
    const mConn = await client.connect();
    const albumData = await mConn.db(DB_NAME).collection("albums").findOne({
        user_id: ObjectId.createFromHexString(uid) 
    });
    await mConn.close();

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