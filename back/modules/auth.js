/**
 * @module back/auth
 * @description Middleware for JWT authentication
 */

const { optionsJWS } = require('./common.js');
const jwt = require('jsonwebtoken');

/**
 * Takes the user id and whether xe is an admin.
 * Returns an object containing a JSON Web Signed token and the options to supply to the cookie.
 * Raises jwt.sign()' errors.
 * @param {String} uid
 * @param {boolean} admin
 * @returns {{String, Object}} {JSON Web Signed token, cookie options}
 */
function genJWS(uid, admin){
    let now = Number.parseInt(Date.now()/1000);
    return {
        tok: jwt.sign(
            {
                "sub": uid,
                "admin": false, // admins are not currently supported
                "iss": "AFSE",
                "iat": now,
                "exp": now + Number.parseInt(process.env.JWT_EXPIRATION_TIME),
            },
            process.env.JWT_SECRET_KEY, { algorithm: "HS256" }
        ),
        opts: optionsJWS
    }
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {} next
 *
 */
function jwtauth(){
    return function (req, res, next){
        const token = req.cookies.session_token;
        let payload;
    
        // check if the token is there, if not check if the route can be accessed anyway, if not error out
        try{
            payload = jwt.verify(token, process.env.JWT_SECRET_KEY,
                {
                    "algorithms": ["HS256"],
                    "issuer": "AFSE",
                }
            )
            req.uid = payload.sub;
        }
        catch(e){
            payload = null;
            // if the token is invalid or expired clear it
            res.clearCookie('session_token', optionsJWS);
        }

        // If the user agent cannot be authenticated we only allow the strict necessary to login and register
        if(!payload){
            if(![
                '/shared/lib.js',
                '/js/navbar.js',
                '/css/main.css',
                '/css/colorpalette.css',
                '/account/login',
                '/account/register',
                '/characters/names',
                '/',
                '/favicon.ico',
                '/login.html',
                '/login.html?logout=y',
                '/register.html',
                '/js/login.js',
                '/js/register.js',
            ].includes(req.path)){
                // res.status(401).send('401 Unauthorized');
                console.log(req.path);
                // this endpoint will delete the jws token and the localstorage
                res.redirect('/login.html?logout=y');
                res.end();
                return;
            }
        }
        else{
            // the JWS token is valid
            const elapsed = Number.parseInt(Date.now()/1000) - payload.iat;
            const perc = elapsed/process.env.JWT_EXPIRATION_TIME;
            if(perc > 0.85){
                // renew the JWS token
                const {tok, opts} = genJWS(payload.sub, admin=false);
                res.cookie('session_token', tok, opts);
            }
        }

        next();
    }
}

module.exports = {
    jwtauth,
    genJWS
}
