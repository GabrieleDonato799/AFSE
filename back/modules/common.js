/**
 * @module back/common
 */

const crypto = require('crypto');
const process = require('process');
const express = require('express');
const { MongoClient } = require('mongodb');

const HOST = "0.0.0.0";
const PORT = 3005;
const DB_NAME = "afse"; // MongoDB Atlas DB name
const SUPERCARD_PACKET_SIZE = 5;
const PRICE_FOR_A_PACKET = 1;

const mAtlasURI = "<MongoDB Atlas configuration URI goes here>";

const app = express();

var client = new MongoClient(mAtlasURI);

function hashSha256(input){
    return crypto.createHash('sha256')
    .update(input)
    .digest('hex')
}

// const getMarvelCharacterById = lib.memoize(async (id) => {
//     return api_marvel.getFromMarvel(`public/characters/${id}`,``);
// });

module.exports = {
    app, client, HOST, PORT, DB_NAME, SUPERCARD_PACKET_SIZE, PRICE_FOR_A_PACKET, hashSha256
};
