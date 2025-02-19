/**
 * @module back/characters
 */

const { app } = require('./common.js');
const api_marvel = require('../../front/shared/api_marvel.js');

async function getCharacterContent(contentType, cid, res){
    console.log(`[getCharacterContent] contentType: ${contentType}, cid: ${cid}`);
    // retrieve the data from Marvel
    await api_marvel.getFromMarvel(`public/characters/${cid}/${contentType}`, "")
        .then(response => {
            if(response.code === 200){
                res.json(response.data);
            }
            else{
                res.status(500);
                res.json({error: "error during data retrieval"});
            }
        });
}

// Takes the character id and the server response, directly returns the character data or an error in the response.
async function returnCharacterById(cid, res){
    let hero = await getCharacterById(cid);
    try{
        res.json(hero);
    }
    catch(e){
        console.log(e);
        res.status(500);
        res.json({error: "error retrieving the character"});
    }
}

// takes the character id and returns the character data from Marvel' endpoint or undefined in case of error
async function getCharacterById(cid) {
    let response = await api_marvel.getFromMarvel(`public/characters/${cid}`,``);
    let hero = undefined;
    if(response.code === 200){
        hero = response.data.results[0];
        try{
            hero.thumbnail = `${hero.thumbnail.path}.${hero.thumbnail.extension}`;
        }
        catch(e){
            console.log(e);
        }
        console.log(`[getCharacterById] hero:`, hero);
    }
    return hero;
}

// Takes the cid string, taken from the get parameters, to be parsed and the server response.
// Returns -1 on error, the cid as a Number otherwise.
function checkCid(cid, res){
    if(cid === undefined){
        res.status(400);
        res.json({error: "missing cid"});
        return -1;
    }
    try{
        cid = Number.parseInt(cid);
    }catch(e){
        console.log(e);
        res.status(400);
        res.json({error: "cid is not a number"});
        return -1;
    }

    return cid;
}

// characters routes
app.get("/characters/:cid", (req, res) => {
    var cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    returnCharacterById(cid, res);
});

app.get("/characters/:cid/comics", (req, res) => {
    var cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    getCharacterContent("comics", cid, res);
});

app.get("/characters/:cid/series", (req, res) => {
    var cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    getCharacterContent("series", cid, res);
});

app.get("/characters/:cid/events", (req, res) => {
    var cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    getCharacterContent("events", cid, res);
});

module.exports = { getCharacterById };