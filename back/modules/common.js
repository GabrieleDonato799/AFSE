/**
 * @module back/modules/common
 * @description Common variables initialized at startup and functions.
 */

const crypto = require('crypto');
const process = require('process');
const express = require('express');
const { MongoClient } = require('mongodb');
const argon2 = require('argon2');

const HOST = "0.0.0.0";
const PORT = 3005;
const DB_NAME = "afse"; // MongoDB Atlas DB name
const SUPERCARD_PACKET_SIZE = 5;
const PRICE_FOR_A_PACKET = 1;
// Options needed to generate a cookie from a signed JWT token for authentication purposes
const optionsJWS = {
    maxAge: Number.parseInt(process.env.JWT_EXPIRATION_TIME)*1000,
    httpOnly: true,
    sameSite: "Strict",
    secure: true,
};

const mAtlasURI = process.env.ATLAS_URI;

const app = express();

let client = new MongoClient(mAtlasURI);

/**
 * Takes a string and returns a salted hash
 * @param {string} input The data to be salt-hashed
 */
async function hashSaltArgon2(input){
    // The salt is automatically generated and is part of the parametrised hash, see here https://github.com/ranisalt/node-argon2/issues/76#issuecomment-291553840
    return await argon2.hash(input);
}

/**
 * Takes the salted hash and a password, returns whether they match or not
 * @param {string} input The data to be salt-hashed
 * @returns {boolean}
 */
async function verifySaltedHashArgon2(hash, password){
    return await argon2.verify(hash, password);
}

function hashSha256(input){
    return crypto.createHash('sha256')
    .update(input)
    .digest('hex')
}

// const getMarvelCharacterById = lib.memoize(async (id) => {
//     return api_marvel.getFromMarvel(`public/characters/${id}`,``);
// });

module.exports = {
    app, client, HOST, PORT, DB_NAME, SUPERCARD_PACKET_SIZE, PRICE_FOR_A_PACKET, hashSha256, hashSaltArgon2, verifySaltedHashArgon2, optionsJWS
};
