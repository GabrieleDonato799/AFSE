/**
 * @module back/user
 */

const { app, client, DB_NAME, hashSha256 } = require('./common.js');
const { createUserAlbum } = require('./album.js');
const { ObjectId } = require('mongodb');

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
        console.log(e);
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
            console.log(e);
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
 * TODO: Substitute with JWT authentication. 
 * @param {*} res 
 * @param {string} email 
 * @param {string} pwd
 * @returns {boolean} 
 */
async function getUserId(email, pwd){
    var uid = null;
    pwd = hashSha256(pwd);

    try{
        // Cerca un utente con l'email e la password specificate
        uid = await client.db(DB_NAME).collection("users").findOne({
            email: email,
            password: pwd
        });
        uid = uid._id.toHexString();
    }
    catch(e){
        console.log(e);
    }
    finally{
        return uid;
    }
}

/**
 * Checks if a password meets the application requirements
 * Returns false and sets the response status on error.
 * @param {String} pwd 
 */
function checkPwd(res, pwd){
    if (typeof(pwd) !== "string"){
        res.status(400).json({ error: "The password is missing"});
        return false;
    }
    if (pwd.length < 8) {
        res.status(400).json({ error: "The password is too short or missing"});
        return false;
    }
    return true;
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
        checkPwd(res, user.password);
    } else {
        res.status(400).json({ error: "Missing fields" });
        return;
    }

    user.password = hashSha256(user.password)
    user.balance = 0;

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
        });

        // Inserisce il nuovo utente nel database
        const insertedUser = await client.db(DB_NAME).collection("users").insertOne(user);
        createUserAlbum(insertedUser.insertedId);
        res.status(201).json({"_id":user._id});
    } catch (e) {
        if (e.code === 11000) {
            res.status(400).json({ error: "E-mail already in use" });
        } else {
            res.status(500).json({ error: `Generic error: ${e.code}` });
        }
    }
}

/**
 * Effettua il login di un utente
 * @param {*} res
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
        var uid = await getUserId(email, password);
        if (uid) {
            res.json({ id: uid });
        } else {
            res.status(404).json({ error: "Wrong credentials" });
        }
    }
    catch(e){
        console.log(e);
        res.status(404).json({ error: "Error connecting to the database" });
    }
}

/**
 * Updates the user's nickname.
 * Takes the password and the email to verify the user, the new nickname and the user id
 * if the password is correct updates the nickname.
 * @param {*} res
 * @param {string} uid 
 * @param {string} newnick
 * @param {string} email
 * @param {string} pwd
 */
async function updateUserNick(res, uid, newnick, email, pwd) {
    var user = undefined;
    // check if the new nickname respects the requirements
    if(!checkNick(res, newnick)) return;
    // reusing the logic, prevents I/O to the DB
    if(!checkPwd(res, pwd)) return;

    const uidMatch = await getUserId(email, pwd);

    if(uid !== uidMatch){
        res.status(401).json({ error: "Failed to authenticate the user action" });
    }
    else{
        // check if the nickname is already in use
        try{
            nickInUse = await client.db(DB_NAME).collection("users").findOne(
                {nick:newnick},
            )
        }
        catch(e){
            console.log(e);
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
            console.log(e);
            res.status(404).json({ error: "Could not update the password" });
            return;
        }
    
        res.status(200).json({ error: "The nickname was updated correctly" });    
    }

    return;
}

/**
 * Updates the user's email.
 * Takes the user id, old and new emails and the password to verify the user.
 * @param {*} res 
 * @param {string} uid 
 * @param {string} oldemail 
 * @param {string} newemail 
 * @param {string} pwd 
 */
async function updateUserEmail(res, uid, oldemail, newemail, pwd){
    var user = undefined;
    // reusing the logic, prevents I/O to the DB
    if(!checkPwd(res, pwd)) return;

    const uidMatch = await getUserId(oldemail, pwd);

    if(uid !== uidMatch){
        // the user is logged in, the old email is automatically retrieved by the browser so this must be a wrong password.
        res.status(401).json({ error: "Wrong password" });
    }
    else{
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
            console.log(e);
            res.status(404).json({ error: "Could not update the email" });
            return;
        }

        res.status(200).json({ error: "The email was updated correctly" });
    }

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
    var user = undefined;
    // check if the new password respects the requirements
    if(!checkPwd(res, newpwd)) return;

    const uidMatch = await getUserId(email, oldpwd);

    if(uid !== uidMatch){
        // the user is logged in, the email is automatically retrieved by the browser so this must be a wrong old password
        res.status(401).json({ error: "The old password provided does not match the user's old password." });
    }
    else{
        newpwd = hashSha256(newpwd);
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
            console.log(e);
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

app.post("/account/register", (req, res) => {
    addUser(res, req.body);
});

app.put("/account/changepwd/:uid", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const uid = req.body.uid;
    const email = req.body.email;
    const oldpwd = req.body.oldpwd;
    const newpwd = req.body.newpwd;
    updateUserPwd(res, uid, email, oldpwd, newpwd);
});

app.put("/account/changeemail/:uid", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const uid = req.body.uid;
    const oldemail = req.body.oldemail;
    const newemail = req.body.newemail;
    const pwd = req.body.password;
    updateUserEmail(res, uid, oldemail, newemail, pwd);
});

app.put("/account/changenick/:uid", (req, res) => {
    if(req.body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    const uid = req.body.uid;
    const newnick = req.body.newnick;
    const email = req.body.email;
    const pwd = req.body.password;
    updateUserNick(res, uid, newnick, email, pwd);
});

app.get("/account/balance/:uid", (req, res) => {
    const uid = req.params.uid;
    getUserBalance(res, uid);
});

app.get("/account/:uid", (req, res) => {
    const uid = req.params.uid;
    getWholeUser(res, uid);
});

app.delete("/account/:uid", (req, res) => {
    const uid = req.params.uid;
    const email = req.body.email;
    const pwd = req.body.password;
    deleteUser(res, uid, email, pwd);
});

module.exports = { getUser };