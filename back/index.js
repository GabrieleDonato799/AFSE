const fs = require('fs');
const express = require('express');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const e = require('express');
const { log } = require('console');

const HOST = "0.0.0.0";
const PORT = 3005;
const DB_NAME = "afse"; // MongoDB Atlas DB name

const mAtlasURI = "<MongoDB Atlas configuration URI goes here>";
const client = new MongoClient(mAtlasURI);
const app = express();

app.use(express.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

function hashSha256(input){
    return crypto.createHash('sha256')
    .update(input)
    .digest('hex')
}

/**
 * Ottieni un utente specifico per ID dal database
 */
async function getUser(id) {
    const pwmClient = await client.connect();
    const user = await pwmClient.db(DB_NAME).collection("users").findOne({ _id: ObjectId.createFromHexString(id)});
    await pwmClient.close();
    return user;
}

/**
 * Elimina un utente per ID dal database
 */
// async function deleteUser(res, id) {
//     const pwmClient = await client.connect();
//     const result = await pwmClient.db(DB_NAME).collection("users").deleteOne({ _id: ObjectId.createFromHexString(id) });
//     await pwmClient.close();
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

    const pwmClient = await client.connect();
    try {
        // Inserisce il nuovo utente nel database
        await pwmClient.db(DB_NAME).collection("users").findOne(
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

        await pwmClient.db(DB_NAME).collection("users").insertOne(user);
        res.status(201).json({"_id":user._id});
    } catch (e) {
        if (e.code === 11000) {
            res.status(400).json({ error: "E-mail already in use" });
        } else {
            res.status(500).json({ error: `Generic error: ${e.code}` });
        }
    } finally {
        await pwmClient.close();
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

    const pwmClient = await client.connect();
    // Cerca un utente con l'email e la password specificate
    const user = await pwmClient.db(DB_NAME).collection("users").findOne({
        email: body.email,
        password: body.password
    });
    await pwmClient.close();

    if (user) {
        res.json({ id: user._id });
    } else {
        res.status(404).json({ error: "Credenziali Errate" });
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

// start the server
app.listen(PORT, HOST, () => {
    console.log(`Server listening on port: ${PORT}`);
});
