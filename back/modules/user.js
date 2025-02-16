const { app, client, DB_NAME, hashSha256 } = require('./common.js');
const { createUserAlbum } = require('./album.js');
const { ObjectId } = require('mongodb');

/**
 * Ottieni un utente specifico per ID dal database
 */
async function getUser(id) {
    let user = null;
    
    if(id === null){
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
 * Elimina un utente per ID dal database
 */
// async function deleteUser(res, id) {
//     const client = await client.connect();
//     const result = await client.db(DB_NAME).collection("users").deleteOne({ _id: ObjectId.createFromHexString(id) });
//     await client.close();
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
    user.balance = 0;

    try {
        // Inserisce il nuovo utente nel database
        await client.db(DB_NAME).collection("users").findOne(
            {email:user.email}
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

    try{
        // Cerca un utente con l'email e la password specificate
        const user = await client.db(DB_NAME).collection("users").findOne({
            email: body.email,
            password: body.password
        });
        if (user) {
            res.json({ id: user._id });
        } else {
            res.status(404).json({ error: "Credenziali Errate" });
        }
    }
    catch(e){
        console.log(e);
        res.status(404).json({ error: "Error connecting to the database" });
    }
}

async function getUserBalance(res, uid){
    const user = await getUser(uid);
    
    if (user) {
        res.json({ balance: user.balance });
    } else {
        res.status(404).json({ error: "User not found" });
    }
}

// account routes
app.post('/account/login', (req, res) => {
    const body = req.body;
    if(body === undefined)
        res.status(404).json({ error: "Missing request' body"})
    loginUser(res, body);
});

app.post("/account/register", (req, res) => {
    addUser(res, req.body);
});

app.get("/account/balance/:uid", (req, res) => {
    const uid = req.params.uid;
    getUserBalance(res, uid);
});
