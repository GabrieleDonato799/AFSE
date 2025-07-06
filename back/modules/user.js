/**
 * @module back/modules/user
 * @description Endpoints for user creation/deletion, information update (from the settings page), login, registration and logout with JWS token clearing.
 */

const { app, client, DB_NAME, hashSaltArgon2, verifySaltedHashArgon2, optionsJWS } = require('./common.js');
const argon2 = require('argon2');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { genJWS } = require('./auth');

/**
 * Ottieni un utente specifico per ID dal database
 * @param {string} id
 */
async function getUser(id) {
    let user = null;
    
    if(typeof(id) !== "string"){
        return null;
    }

    try {
        // await client.connect();
        user = await client.db(DB_NAME).collection("users").findOne({ _id: ObjectId.createFromHexString(id)});
    }catch(e){
        console.error(e);
        console.log("MongoDB overloaded?");
    }finally{
        // await client.close();
    }

    return user;
}

/**
 * Atomically deletes a user, its album and currently unmatched trades.
 * Takes the user id, its email and password to authenticate the transaction and sets the server response.
 * Does not return anything.
 * @param {*} res
 * @param {string} uid
 * @param {string} email
 * @param {string} pwd
 */
async function deleteUser(res, uid, email, pwd){
    // authentication
    const uidMatch = await getUserId(email, pwd);

    if(uid !== uidMatch){
        res.status(401).json({ error: "Failed to authenticate the user action" });
    }
    else{
        const session = client.startSession();
        const transactionOptions = {
            // A transaction with 'majority' concern will be acknowledged after most of the data holders are updated. https://www.mongodb.com/docs/manual/core/transactions/#transactions-and-write-concern
            writeConcern: { w: 'majority' },
            readConcern: { r: 'majority' }
        };
        const wantOrOffFilter = {$or: [
            {wanter: ObjectId.createFromHexString(uid)},
            {offerer: ObjectId.createFromHexString(uid)}
        ]}
        const user_id = ObjectId.createFromHexString(uid);

        try {
            await session.withTransaction(async () => {
                const collAlbums = client.db(DB_NAME).collection('albums');
                const collTrades = client.db(DB_NAME).collection('trades');
                const collUsers = client.db(DB_NAME).collection('users');
                await collAlbums.deleteOne({ user_id: user_id }, { session });
                await collTrades.deleteMany(wantOrOffFilter, { session });
                await collUsers.deleteOne({ _id: user_id }, { session });
            }, transactionOptions);
        }
        catch(e){
            console.error(e);
            res.status(500).json({error: "Failed to delete the user's account"});
        }
        finally {
            await session.endSession();
        }

        res.json({error: "Successfully deleted the user's account"});
    }
}

/**
 * Takes the server response, user's email and password and returns its user_id or null on error or if the user doesn't exist.
 * It's meant to be used in the endpoint response code that needs to verify a password before performing an privileged action. The code can check if the supplied user id matches the one returned by this function. If they are equal then this user is authenticated, must be rejected otherwise.
 * Assumes that every user has a unique email.
 * @param {Response} res 
 * @param {string} email 
 * @param {string} pwd
 * @returns {string|null} 
 */
async function getUserId(email, pwd){
    let uid = null;

    try{
        // Search up a user with the only email (internal identificator of the user)
        user = await client.db(DB_NAME).collection("users").findOne({
            email: email
        });
        const matches = await verifySaltedHashArgon2(user.password, pwd);
        if(!matches) throw Error("Wrong Credentials");
        uid = user._id.toHexString();
    }
    catch(e){
        console.error(e);
    }
    finally{
        return uid;
    }
}

/**
 * Checks if a password meets the application requirements
 * Returns false and sets the response status on error.
 * @param {express.Response} res
 * @param {String} pwd
 * @param {String} email
 */
function checkPwd(res, pwd, email){
    let result = true;
    if (typeof(pwd) !== "string"){
        res.status(400).json({ error: "The password is missing"});
        result = false;
    }
    else if (pwd.length < process.env.PASSWORD_MIN_LENGTH) {
        res.status(400).json({ error: `The password is too short or missing, must be at least ${process.env.PASSWORD_MIN_LENGTH} characters long.`});
        result = false;
    }
    else if (pwd === email){
        res.status(400).json({ error: "The password must be different from the email" });
        result = false;
    }
    
    return result;
}

/**
 * Checks if a nickname meets the application requirements
 * Returns false and sets the response status on error.
 * @param {String} nick 
 */
function checkNick(res, nick){
    if (typeof(nick) !== "string"){
        res.status(400).json({ error: "The nickname is missing"});
        return false;
    }
    if (nick.length < 3) {
        res.status(400).json({ error: "The nickname is too short"});
        return false;
    }
    return true;
}

/**
 * Aggiungi un nuovo utente al database
 */
async function addUser(res, user) {
    // Controlla se tutti i campi obbligatori sono presenti
    if (user.nick && user.email && user.password) {
        // Controlla se i campi soddisfano i requisiti
        if(!checkPwd(res, user.password, user.email)){
            return;
        }
    } else {
        res.status(400).json({ error: "Missing fields" });
        return;
    }

    user.password = await hashSaltArgon2(user.password);
    user.balance = 0;
    user.registration_date = Date.now();

    try {
        await client.db(DB_NAME).collection("users").findOne(
            { $or: [
                {nick:user.nick},
                {email:user.email},
            ] }
        )
        .then(response => {
            // Nessun utente è loggato
            if(response === null){
                return;
            }
            if(response._id != undefined){
                let error = new Error("User is already registered");
                error.code = 11000;
                throw error;
            }
        })

        // Inserisce il nuovo utente nel database
        const insertedUser = await client.db(DB_NAME).collection("users").insertOne(user);
        createUserAlbum(insertedUser.insertedId);

        // Return a JWS token
        const {tok, opts} = genJWS(user._id, admin=false);
        res.cookie('session_token', tok, opts);
        res.status(201).json({"_id":user._id, "nick":user.nick});
    } catch (e) {
        console.error(e);
        if (e.code === 11000) {
            res.status(400).json({ error: "E-mail already in use" });
        } else {
            res.status(500).json({ error: `Generic error: ${e.code}` });
        }
    }
}

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

/**
 * Effettua il login di un utente
 * @param {Response} res
 * @param {string} email
 * @param {string} password
 */
async function loginUser(res, email, password) {
    // Controlla se l'email e la password sono presenti
    if (!email) {
        res.status(400).json({ error: "Missing email" });
        return;
    }
    if (!password) {
        res.status(400).json({ error: "Missing password" });
        return;
    }

    try{
        // Cerca un utente con l'email e la password specificate
        // TODO: to speedup the login return the entire user
        let uid = await getUserId(email, password);
        let user = await getUser(uid);
        console.log(user);
        if (uid) {
            const {tok, opts} = genJWS(uid, admin=false);
            res.cookie('session_token', tok, opts);
            res.json({ id: uid, nick: user.nick });
        } else {
            res.status(404).json({ error: "Wrong credentials" });
        }
    }
    catch(e){
        console.error(e);
        res.status(404).json({ error: "Error connecting to the database" });
    }
}

/**
 * Clears the user agent's cookies. Needed for httpOnly cookies like JWT tokens.
 * @param {Express.Response} res
 */
async function clearCookies(res){
    res.clearCookie('session_token', optionsJWS);
}

/**
 * Updates the user's favorite hero.
 * @param {*} res
 * @param {string} uid 
 * @param {string} newfavhero
 */
async function updateFavHero(res, uid, newfavhero) {
    let user = undefined;

    // update the favorite hero
    try {
        const result = await client.db(DB_NAME).collection("users").updateOne(
            {
                _id: ObjectId.createFromHexString(uid)
            },
            {
                $set: {"favhero": newfavhero}
            },
        );

        if (result.modifiedCount === 0){
            // The request was unsuccessful
            res.status(404).json({ error: "Could not update the favorite hero, database error" });
            return;
        }
    } catch (e) {
        console.error(e);
        res.status(404).json({ error: "Could not update the favorite hero" });
        return;
    }

    res.status(200).json({ error: "The favorite hero was updated correctly" });    

    return;
}

/**
 * Updates the user's nickname.
 * Takes the new nickname and the user id.
 * if the password is correct updates the nickname.
 * @param {*} res
 * @param {string} uid 
 * @param {string} newnick
 */
async function updateUserNick(res, uid, newnick) {
    let user = undefined;
    // check if the new nickname respects the requirements
    if(!checkNick(res, newnick)) return;
    // check if the nickname is already in use
    try{
        nickInUse = await client.db(DB_NAME).collection("users").findOne(
            {nick:newnick},
        )
    }
    catch(e){
        console.error(e);
        res.status(404).json({ error: "Database error occured during nickname update" });
        return;
    }

    if(nickInUse){
        res.status(404).json({ error: "The nickname is already taken" });
        return;
    }

    // update the nickname
    try {
        const result = await client.db(DB_NAME).collection("users").updateOne(
            {
                _id: ObjectId.createFromHexString(uid)
            },
            {
                $set: {"nick": newnick}
            },
        );

        if (result.modifiedCount === 0){
            // The request was unsuccessful
            res.status(404).json({ error: "Could not update the nickname, database error" });
            return;
        }
    } catch (e) {
        console.error(e);
        res.status(404).json({ error: "Could not update the nickname" });
        return;
    }

    res.status(200).json({ error: "The nickname was updated correctly" });
    
    return;
}

/**
 * Updates the user's email.
 * Takes the user id, old and new emails of the user.
 * @param {*} res 
 * @param {string} uid 
 * @param {string} oldemail 
 * @param {string} newemail 
 */
async function updateUserEmail(res, uid, oldemail, newemail){
    if(oldemail == newemail){
        res.status(400).json({ error: "The new email provided is exactly the previous one. Nothing done." })
        return;
    }

    try {
        const result = await client.db(DB_NAME).collection("users").updateOne(
            {
                _id: ObjectId.createFromHexString(uid)
            },
            {
                $set: {"email": newemail}
            },
        );

        if (result.modifiedCount === 0){
            // The request was unsuccessful
            res.status(404).json({ error: "Could not update the email, database error" });
            return;
        }
    } catch (e) {
        console.error(e);
        res.status(404).json({ error: "Could not update the email" });
        return;
    }

    res.status(200).json({ error: "The email was updated correctly" });

    return;
}

/**
 * Updates the user's password.
 * Takes the old and new passwords and the user id, checks the old against the user's password and if it matches it is replaced with the new one.
 * @param {*} req 
 * @param {*} res 
 * @param {string} uid
 * @param {string} email
 * @param {string} oldpwd
 * @param {string} newpwd
 */
async function updateUserPwd(res, uid, email, oldpwd, newpwd) {
    let user = undefined;
    // check if the new password respects the requirements
    if(!checkPwd(res, newpwd, email)) return;

    const uidMatch = await getUserId(email, oldpwd);

    if(uid !== uidMatch){
        // the user is logged in, the email is automatically retrieved by the browser so this must be a wrong old password
        res.status(401).json({ error: "The old password provided does not match the user's old password." });
    }
    else{
        newpwd = await hashSaltArgon2(newpwd);
        try {
            const result = await client.db(DB_NAME).collection("users").updateOne(
                {
                    _id: ObjectId.createFromHexString(uid)
                },
                {
                    $set: {"password": newpwd}
                },
            );

            if (result.modifiedCount === 0){
                // The request was unsuccessful
                res.status(404).json({ error: "Could not update the password, database error" });
                return;
            }
        } catch (e) {
            console.error(e);
            res.status(404).json({ error: "Could not update the password" });
            return;
        }

        res.status(200).json({ error: "The password was updated correctly" });
    }

    return;
}

async function getUserBalance(res, uid){
    const user = await getUser(uid);
    
    if (user) {
        res.json({ balance: user.balance });
    } else {
        res.status(404).json({ error: "User not found" });
    }
}

async function getWholeUser(res, uid){
    const user = await getUser(uid);
    
    if (user) {
        delete user.album_id;
        delete user.password; // prevents leaking the hash
        res.json(user);
    } else {
        res.status(404).json({ error: "User not found" });
    }
}

// account routes
app.post('/account/login', (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const email = req.body.email;
    const password = req.body.password;
    loginUser(res, email, password);
});

app.delete('/account/logout', (req, res) => {
    clearCookies(res);
    res.end();
});

app.post("/account/register", (req, res) => {
    addUser(res, req.body);
});

app.put("/account/changepwd", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const email = req.body.email;
    const oldpwd = req.body.oldpwd;
    const newpwd = req.body.newpwd;
    updateUserPwd(res, req.uid, email, oldpwd, newpwd);
});

app.put("/account/changeemail", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const oldemail = req.body.oldemail;
    const newemail = req.body.newemail;
    updateUserEmail(res, req.uid, oldemail, newemail);
});

app.put("/account/changenick", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const newnick = req.body.newnick;
    updateUserNick(res, req.uid, newnick);
});

app.put("/account/changefavhero", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const newfavhero = req.body.newfavhero;
    updateFavHero(res, req.uid, newfavhero);
});

app.get("/account/balance", (req, res) => {
    getUserBalance(res, req.uid);
});

app.get("/account", (req, res) => {
    getWholeUser(res, req.uid);
});

app.delete("/account", (req, res) => {
    const email = req.body.email;
    const pwd = req.body.password;
    deleteUser(res, req.uid, email, pwd);
});

module.exports = { getUser };
