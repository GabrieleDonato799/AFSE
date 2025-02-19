/**
 * @module index
 */

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const { app } = require('./modules/common');
require('isomorphic-fetch'); // prevents api_marvel.js from throwing an undefined error

const HOST = "0.0.0.0";
const PORT = 3005;

app.use(express.json());
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(__dirname + '/../front')); // Tell express from where it should deliver the static content
app.use('/favicon.ico', express.static(__dirname + '/../front/favicon.ico'));

require('./modules/album.js');
require('./modules/characters.js');
require('./modules/exchange.js');
require('./modules/offers.js');
require('./modules/packets.js');
require('./modules/user.js');
require('./modules/rarity.js');
// require('./modules/.js');

// start the server
app.listen(PORT, HOST, () => {
    console.log(`Server listening on port: ${PORT}`);
});
