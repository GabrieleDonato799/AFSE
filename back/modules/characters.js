/**
 * @module back/modules/characters
 * @description Characters related endpoints for information retrieval and the server side of the album search bar functionality.
 */

const { app } = require('./common.js');
const api_marvel = require('./api_marvel.js');
const { getMarvelCharacterById, marvelCache } = require('./rarity.js');

async function getCharacterContent(contentType, cid, res){
    // console.log(`[getCharacterContent] contentType: ${contentType}, cid: ${cid}`);
    // retrieve the data from Marvel
    await api_marvel.getFromMarvel(`public/characters/${cid}/${contentType}`, "")
        .then(response => {
            if(response !== undefined && response.code === 200){
                res.json(response.data);
            }
            else{
                // search it in the cached resources
                let data = marvelCache[`${contentType}`].filter(hero =>{return hero.id===cid})[0];
                
                if(data['data'] !== undefined)
                    res.json(data['data']);
                else
                    res.json({results: []});
            }
        })
        .catch(_ => console.error(_));
}

// Takes the character id and the server response, directly returns the character data or an error in the response.
async function returnCharacterById(cid, res){
    let hero = await getCharacterById(cid);

    if(!hero){
        // try to fall back to the cached json file
        hero = getMarvelCharacterById(cid);
        if(!hero){
            res.json({error: "Error retrieving the character"});
            return;
        }
    }

    try{
        let char = getMarvelCharacterById(cid);
        hero.rarity = char.rarity;
        res.json(hero);
    }
    catch(e){
        console.error(e);
        res.status(500);
        res.json({Error: "Error retrieving the character"});
    }
}

// takes the character id and returns the character data from Marvel' endpoint or undefined in case of error
async function getCharacterById(cid) {
    let response = await api_marvel.getFromMarvel(`public/characters/${cid}`,``);
    let hero = undefined;

    if(response === undefined){
        console.error(`[getCharacterById] API is down`);
    }
    else if(response.code === "RequestThrottled"){ // Rate limited
        console.error(`[getCharacterById] 429 ${response.message}`);
    }
    else{
        // if(response.code === 200){ // the server can't determine it because getFromMarvel returns the json of the response
        if(response.data && response.data.results){
            hero = response.data.results[0];
            try{
                hero.thumbnail = `${hero.thumbnail.path}.${hero.thumbnail.extension}`;
            }
            catch(e){
                console.error(e);
            }
            // console.log(`[getCharacterById] hero:`, hero);
        }
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
        console.error(e);
        res.status(400);
        res.json({error: "cid is not a number"});
        return -1;
    }

    return cid;
}

/**
 * Takes a search term and the response object, looks up for matches in the characters cache and returns them.
 * @param {string} term 
 * @param {Response} res
 * @returns {array}
 */
function searchInCache(term, res){
    let matches = marvelCache.characters
                    .filter(hero => {return hero.name.toLowerCase().includes(term.toLowerCase())})
                    .map(hero => hero.id);
    res.json(matches);
}

// characters routes
app.get("/characters/names", (req, res) => {
    let data = [];
    marvelCache.characters.forEach(hero => {
        data.push(hero.name);
    });
    res.json(JSON.stringify(data));
});

app.get("/characters/:cid", (req, res) => {
    let cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    returnCharacterById(cid, res);
});

app.get("/characters/:cid/comics", (req, res) => {
    let cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    getCharacterContent("comics", cid, res);
});

app.get("/characters/:cid/series", (req, res) => {
    let cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    getCharacterContent("series", cid, res);
});

app.get("/characters/:cid/events", (req, res) => {
    let cid = req.params.cid;
    if((cid = checkCid(cid, res)) === -1) return;

    getCharacterContent("events", cid, res);
});

app.post("/characters/search", (req, res) => {
    let term = req.body.term;
    console.log(req.body);
    searchInCache(term, res);
});

module.exports = { getCharacterById };
