/**
 * @module back/index
 * @description Entry point, .env loading, EJS templates rendering.
 */

const dotenv = require('dotenv');
if(err = dotenv.config({ path: 'back/.env' }).error){
    console.error(err);
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const { app, PORT, HOST } = require('./modules/common');
const { jwtauth } = require('./modules/auth');

app.use(express.json());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3005'
    ],
    credentials: true
}));

app.use(cookieParser());
app.use(jwtauth());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/index.html', (req, res) => {
    res.redirect(301, 'login.html');
});
app.use(express.static(__dirname + '/../front')); // Tell express from where it should deliver the static content
app.use('/favicon.ico', express.static(__dirname + '/../front/favicon.ico'));

require('./modules/schema.js');
require('./modules/api_marvel.js');
require('./modules/album.js');
require('./modules/characters.js');
require('./modules/exchange.js');
require('./modules/offers.js');
require('./modules/packets.js');
require('./modules/user.js');
require('./modules/rarity.js');
// require('./modules/.js');

app.set('view engine', 'ejs');
app.set('views', 'front/views');

// introducing EJS template this way doesn't break the application
app.get('/album.html', (req, res) => {res.render('album')});
app.get('/credits.html', (req, res) => {res.render('credits')});
app.get('/exchange.html', (req, res) => {res.render('exchange')});
app.get('/login.html', (req, res) => {res.render('login')});
app.get('/profile.html', (req, res) => {res.render('profile')});
app.get('/register.html', (req, res) => {res.render('register')});
app.get('/carddetails.html', (req, res) => {res.render('carddetails')});
app.get('/unpacking.html', (req, res) => {res.render('unpacking')});
app.get('*', (req, res) => {
    res.redirect(301, '/login.html');
});

// start the server
app.listen(PORT, HOST, () => {
    console.log(`Server listening on port: ${PORT}`);
});
