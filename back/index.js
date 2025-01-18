const fs = require('fs');
const express = require('express');
const crypto = require('crypto');
const { MongoClient, ObjectId, Db } = require('mongodb');
const cors = require('cors');
const api_marvel = require('../front/shared/api_marvel.js');
const lib = require('../front/shared/lib.js');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const e = require('express');
const { log } = require('console');
const { off } = require('process');

const HOST = "0.0.0.0";
const PORT = 3005;
const DB_NAME = "afse"; // MongoDB Atlas DB name
const SUPERCARD_PACKET_SIZE = 5;
const PRICE_FOR_A_PACKET = 1;

const mAtlasURI = "<MongoDB Atlas configuration URI goes here>";

// It contains all the data extracted from the Marvel API,
// without the characters with a missing thumbnail and
// with the precalculated rarity 
var marvelCharacters = undefined;

getMarvelCharacters().then((res) =>{
    marvelCharacters = res;
    console.log(`Downloaded the Marvel' characters`);
});

// Sometimes there can be connection errors or expiring sessions,
// I want to manage them to avoid service interruption.
var client = new MongoClient(mAtlasURI);
process.on('uncaughtException', function(err) {
    if(err.name == "MongoTopologyClosedError" ||
        err.name == "MongoExpiredSessionError"
    ){
        client = new MongoClient(mAtlasURI);
    }
})

const app = express();

function waitMarvelData(req,res,next){
    if(marvelCharacters === undefined){
        res.status(500)
        return res.json({ error: "Server starting" })
    }
    next();
}

app.use(waitMarvelData);
app.use(express.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(__dirname + '/../front')); // Tell express from where it should deliver the static content

function hashSha256(input){
    return crypto.createHash('sha256')
    .update(input)
    .digest('hex')
}

// A memoized function to retrieve the marvel characters
// redefined by getMarvelCharacters() every time it recalculates
// the character list
var getMarvelCharacterById = undefined;

async function getMarvelCharacters(){
    let characters = [];

    // Returns a dataset comprising the name, modified date and rarity of every
    // superhero where a thumbnail is provided (not verifing if it is actually ok)

    let reqs = []
    for(let i=0; i<17; i++){
        reqs.push(api_marvel.getFromMarvel(`public/characters`,`limit=100&offset=${i*100}`));
    }
    return Promise.all(reqs).then(responses => {
        for(let res of responses){
            for(let hero of res['data']['results']){
                if(!hero['thumbnail']['path'].includes("image_not_available")){
                    let rarity = hero['comics']['available']
                    rarity += hero['series']['available']
                    rarity += hero['events']['available']
                    hero.rarity = rarity;
                    characters.push(hero);
                }
            }
        }

        let rarities = calculateRarity(characters);
        let rarityColors = determineRarityColors(rarities);
        for(let i in characters){
            characters[i].rarity = rarityColors[i]; 
        }

        for(let i in characters){
            characters[i].thumbnail = characters[i].thumbnail.path + "." + characters[i].thumbnail.extension; 
        }

        getMarvelCharacterById = lib.memoize(function (id) {
            for(let c of marvelCharacters){
                if(c.id === id){
                    return c;
                }
            }
        });

        return characters;
    });
}

function calculateRarity(characters){
    let rarity = [];
    let tot_rarity = 0;
    let invert_rarity = [];
    let min_rarity = Number.MAX_VALUE;
    let min_invert_rarity = [];
    let norm_rarity = [];

    for(let elem of characters)
        rarity.push(elem.rarity);
    for(let r of rarity)
        tot_rarity += r;
    for(let r of rarity)
        invert_rarity.push(tot_rarity-r);
    for(let r of invert_rarity)
        if(r < min_rarity)
            min_rarity = r;
    min_rarity -= 1;
    for(let r of invert_rarity)
        min_invert_rarity.push(r-min_rarity);
    tot_rarity = 0;
    for(let r of min_invert_rarity)
        tot_rarity += r;
    for(let r of min_invert_rarity)
        norm_rarity.push(r/tot_rarity);

    return norm_rarity;
}

// Takes the rarities of the characters and determines
// for each one which rarity color to assign.
function determineRarityColors(rarities){
    let colors = ["ff0000", "ffcc00", "9c00ff", "0090ff", "009623"];
    let max = Math.max(...rarities);
    let min = Math.min(...rarities);

    // Every character will get the rarity color depending on which
    // threshold it gets past, binarySearchRight() requires the first value
    // to be 0.0, otherwise it wont ever return the first intended value
    let rarityThresholds = [];
    let step = (max/colors.length);
    for(let i=0; i<colors.length; i++){
        rarityThresholds.push(step * i);
    }

    // console.log(min);
    // console.log(max);
    // console.log(colors.length);
    // console.log(rarities);
    // console.log(rarityThresholds);
    // console.log(step);

    // Determine the color for every character
    let rarityColors = [];
    for(let i=0; i<rarities.length; i++){
        rarityColors[i] = colors[lib.binarySearchRight(rarityThresholds, rarities[i])];
    }

    // console.log(rarityColors);

    return rarityColors;
}

/**
 * Ottieni un utente specifico per ID dal database
 */
async function getUser(id) {
    try {
        const mConn = await client.connect();
        const user = await mConn.db(DB_NAME).collection("users").findOne({ _id: ObjectId.createFromHexString(id)});
        return user;
    }catch(e){
        console.log("MongoDB overloaded?");
    }finally{
        await mConn.close();
    }
}

/**
 * Elimina un utente per ID dal database
 */
// async function deleteUser(res, id) {
//     const mConn = await client.connect();
//     const result = await mConn.db(DB_NAME).collection("users").deleteOne({ _id: ObjectId.createFromHexString(id) });
//     await mConn.close();
//     res.json(result);
// }

/**
 * Aggiungi un nuovo utente al database
 */
async function addUser(res, user) {
    // Controlla se tutti i campi obbligatori sono presenti
    if (user.email && user.password) {
        // Controlla se i campi soddisfano i requisiti di lunghezza
        if (user.password.length < 8) {
            res.status(400).send("The password is too short or missing");
            return;
        }
    } else {
        res.status(400).send("Missing fields");
        return;
    }

    user.password = hashSha256(user.password)

    const mConn = await client.connect();
    try {
        // Inserisce il nuovo utente nel database
        await mConn.db(DB_NAME).collection("users").findOne(
            {email:user.email}
        )
        .then(response => {
            // Nessun utente è loggato
            if(response === null){
                return;
            }
            if(response._id != undefined){
                error = new Error("User is already registered");
                error.code = 11000;
                throw error;
            }
        });

        const insertedUser = await mConn.db(DB_NAME).collection("users").insertOne(user);
        await mConn.close();
        createUserAlbum(insertedUser.insertedId);
        res.status(201).json({"_id":user._id});
    } catch (e) {
        if (e.code === 11000) {
            res.status(400).json({ error: "E-mail already in use" });
        } else {
            res.status(500).json({ error: `Generic error: ${e.code}` });
        }
    } finally {
        await mConn.close();
    }
}

/**
 * Effettua il login di un utente
 */
async function loginUser(res, body) {
    // Controlla se l'email e la password sono presenti
    if (!body.email) {
        res.status(400).json({ error: "Email Mancante" });
        return;
    }
    if (!body.password) {
        res.status(400).send({ error: "Password Mancante" });
        return;
    }

    body.password = hashSha256(body.password);

    const mConn = await client.connect();
    // Cerca un utente con l'email e la password specificate
    const user = await mConn.db(DB_NAME).collection("users").findOne({
        email: body.email,
        password: body.password
    });
    await mConn.close();

    if (user) {
        res.json({ id: user._id });
    } else {
        res.status(404).json({ error: "Credenziali Errate" });
    }
}

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

    const albumLinked = await mConn.db(DB_NAME).collection("users").updateOne(
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

    var album = {supercards: []};
    for(let hero_id of albumData.supercards){
        let hero = getMarvelCharacterById(hero_id);
        
        if(hero === undefined)
            continue;
        album.supercards.push({
            id: hero_id,
            name: hero.name,
            rarity: hero.rarity,
            thumbnail: hero.thumbnail
        });
    }

    album.supercards.sort((a, b) => {return a.name.localeCompare(b.name)});

    res.json(album);
}

async function generatePacket(res, uid){
    let packet = [];
    let userBalance = 0; 
    
    const mConn = await client.connect();
    // TODO: Atomically check the user balance and update its album if not full
    try{
        // retrieves the user balance
        // FIND
        userBalance = await mConn.db(DB_NAME).collection("users").findOne(
            {user_id: ObjectId.createFromHexString(uid)},
        ).balance;

        // BACKEND CHECK
        if(userBalance < PRICE_FOR_A_PACKET){
            res.json({error: "insufficient balance"});
            res.status(402);
            return;
        }

        // GENERATION
        for(let i=0; i<SUPERCARD_PACKET_SIZE; i++){
            id = crypto.randomInt(0, marvelCharacters.length);
            packet.push(marvelCharacters[id].id);
        }
        
        // UPDATE DOCUMENT IN A DIFFERENT COLLECTION
        // Updates the user album
        console.log(await mConn.db(DB_NAME).collection("albums").updateOne(
            {user_id: ObjectId.createFromHexString(uid)},
            {$addToSet: {supercards: {$each: packet}}}
        ));

        // UPDATE
        console.log(await mConn.db(DB_NAME).collection("users").updateOne(
            {_id: ObjectId.createFromHexString(uid)},
            {$inc: {balance: -1}}
        ));
    
        res.json(packet);
    }catch(e){
        console.log("MongoDB overloaded?");
    }finally{
        await mConn.close();
    }
}

async function getOffers(res){
    const mConn = await client.connect();
    var offers = [];

    try{
        response = await mConn.db(DB_NAME).collection("offers").find();
        // console.log(offers);
        for await (let o of response){
            offers.push(o);
        }
        res.json({offers});
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }finally{
        await mConn.close();
    }
}

async function buyOffer(req, res, uid){
    const mConn = await client.connect();
    const id = req.body.id;

    try{
        // retrieve the corresponding offer
        offer = await mConn.db(DB_NAME).collection("offers").findOne(
            {_id: ObjectId.createFromHexString(id)}
        );
        console.log(offer);

        // TODO: Atomically check the user balance and update it accordingly
        if(offer.type === "coins"){
            const albumLinked = await mConn.db(DB_NAME).collection("users").updateOne(
                {_id: ObjectId.createFromHexString(uid)},
                {$inc: {balance: offer.amount}}
            );
        }else if(offer.type === "packets"){
            // check if user has sufficient balance --> 

            // update user balance
        }

        res.json({error: "success"});
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }finally{
        await mConn.close();
    }
}

async function createTrade(req, res){
    const mConn = await client.connect();
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

        await mConn.db(DB_NAME).collection("trades").insertOne(trade);
        
        res.json({error: "success"});
    }catch(e){
        console.log("MongoDB overloaded?");
        console.log(e);
    }finally{
        await mConn.close();
    }

    // try to automatically match the trade
    if(trade !== undefined)
        await matchTrade(trade);

    return res;
}

async function getTrades(req, res, uid){
    const mConn = await client.connect();
    let trades = [];

    try{
        let response = await mConn.db(DB_NAME).collection("trades").find(
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
    }finally{
        await mConn.close();
    }
}

async function matchTrade(trade){
    const mConn = await client.connect();
    let trades = [];

    try{
        let response = await mConn.db(DB_NAME).collection("trades").find(
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
    }finally{
        await mConn.close();
    }
}

// account routes
app.post('/account/login', (req, res) => {
    const body = req.body;
    loginUser(res, body);
});

app.post("/account/register", (req, res) => {
    addUser(res, req.body);
});

// album routes
app.get("/album/:uid", (req, res) => {
    const uid = req.params.uid;

    try{
        ObjectId.createFromHexString(uid);
    }catch(e){
        res.status(400);
        res.json({error: "missing uid"});
        return;
    }

    getUserAlbum(res, uid);
});

// packets routes
app.get("/packets/:uid", (req, res) =>{
    const uid = req.params.uid;

    try{
        ObjectId.createFromHexString(uid);
    }catch(e){
        res.status(400);
        res.json({error: "missing uid"});
        return;
    }
    
    generatePacket(res, uid);
});

// characters routes
app.get("/characters/:cid", (req, res) => {
    var cid = req.params.cid;
    if(cid === undefined){
        res.status(400);
        res.json({error: "missing cid"});
        return;
    }
    try{
        cid = Number.parseInt(cid);
    }catch(e){
        res.status(400);
        res.json({error: "cid is not a number"});
        return;
    }
    res.json({result: getMarvelCharacterById(cid)});
});

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
})

// exchange route
app.post("/exchange/trade", (req, res) => {
    let trade = createTrade(req, res);
});

app.get("/exchange/trades/:uid", (req, res) => {
    var uid = req.params.uid;
    if(uid === undefined){
        res.status(400);
        res.json({error: "missing uid"});
        return;
    }
    getTrades(req, res, uid);
});

// start the server
app.listen(PORT, HOST, () => {
    console.log(`Server listening on port: ${PORT}`);
});
