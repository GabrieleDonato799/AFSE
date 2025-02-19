/**
 * @module back/rarity
 */

const { app } = require('./common.js');
const lib = require('../../front/shared/lib.js')
const api_marvel = require('../../front/shared/api_marvel.js');
const fs = require('fs');
const { error } = require('console');
const { exit } = require('process');

/**
 * It contains all the data extracted from the Marvel API, without the characters with a missing thumbnail and with the precalculated rarity.
 * Data is loaded asynchronously and once it's ready the ready field will be set to true.
 * @field {Object} data
 * @field {boolean} ready
 */
var marvelCharacters = {
    data: undefined,
    ready: false,
};

/**
 * A memoized function to retrieve the marvel characters redefined by getMarvelCharacters() every time it recalculates the character list.
 */
var getMarvelCharacterById = lib.memoize(function (id) {
    for(let c of marvelCharacters){
        if(c.id === id){
           return c;
        }
    }
});

/**
 * Returns a dataset comprising the name, modified date and rarity of every superhero where a thumbnail is provided (not verifing if it is actually ok).
 * Note that this data should be cached and refreshed periodically, otherwise the end user will not see new heroes in the generated packets.
 * @returns {Array}
 */
async function getMarvelCharacters(){
    let characters = [];

    let reqs = []
    for(let i=0; i<17; i++){
        reqs.push(api_marvel.getFromMarvel(`public/characters`,`limit=100&offset=${i*100}`));
    }
    return Promise.all(reqs).then(responses => {
        for(let res of responses){
            for(let hero of res['data']['results']){
                if(!hero['thumbnail']['path'].includes("image_not_available")){
                    let rarity = hero['comics']['available']
                    rarity += hero['series']['available']
                    rarity += hero['events']['available']
                    hero.rarity = rarity;
                     characters.push(hero);
                }
            }
        }

        let rarities = calculateRarity(characters);
        let rarityColors = determineRarityColors(rarities);
        for(let i in characters){
            characters[i].rarity = rarityColors[i]; 
        }

        for(let i in characters){
            characters[i].thumbnail = characters[i].thumbnail.path + "." + characters[i].thumbnail.extension; 
        }

        return characters;
    });
}

/**
 * Takes an array of characters returned by the Marvel API (content of data.results).
 * Returns an array of rarities calculated in the same order as the characters array.
 * @param {Array} characters 
 * @returns {Array}
 */
function calculateRarity(characters){
    // collect and sum up the rarities
    let rarities = characters.map((c) => c.rarity);
    let tot_rarity = rarities.reduce((sum, x) => sum + x, 0);

    // make the rarest (more resources) hero have low P(extraction) and viceversa
    let invert_rarity = rarities.map((x) => tot_rarity - x);
    let min_rarity = invert_rarity.reduce((min, x) => x < min ? x : min, Number.MAX_VALUE);
    min_rarity -= 1; // otherwise the rarest card would have P(extraction)=0
    let min_invert_rarity = invert_rarity.map((x) => x - min_rarity);

    // normalize
    tot_rarity = min_invert_rarity.reduce((sum, x) => sum + x, 0);
    let norm_rarity = min_invert_rarity.map((x) => x/tot_rarity);

    return norm_rarity;
}

/**
 * Takes the rarities of the characters and determines for each one which rarity color to assign.
 * Returns an array of hexadecimal RGB color strings, calculated in the same order as the characters array.
 * @param {Array} rarities 
 * @returns {Array}
 */
function determineRarityColors(rarities){
    let colors = ["ff0000", "ffcc00", "9c00ff", "0090ff", "009623"];
    let max = Math.max(...rarities);
    let min = Math.min(...rarities);

    // Every character will get the rarity color depending on which
    // threshold it gets past, binarySearchRight() requires the first value
    // to be 0.0, otherwise it wont ever return the first intended value
    let rarityThresholds = [];
    let step = (max/colors.length);
    for(let i=0; i<colors.length; i++){
        rarityThresholds.push(step * i);
    }

    // console.log(min);
    // console.log(max);
    // console.log(colors.length);
    // console.log(rarities);
    // console.log(rarityThresholds);
    // console.log(step);

    // Determine the color for every character
    let rarityColors = [];
    for(let i=0; i<rarities.length; i++){
        rarityColors[i] = colors[lib.binarySearchRight(rarityThresholds, rarities[i])];
    }

    // console.log(rarityColors);

    return rarityColors;
}

const cachePath = '/tmp/marvelcharacters.json';
fs.readFile(cachePath, (err, data) => {
    if(err){
        getMarvelCharacters().then((res) =>{
            marvelCharacters.data = res;
            marvelCharacters.ready = true;
            console.log(`Downloaded the Marvel' characters`);
            fs.open(cachePath, 'w', 0o644, (err, fd) => {
                if(fd < 0){
                    throw new Error(`Couldn't open the cache file ${cachePath}`);
                }
                else{
                    fs.write(fd, JSON.stringify(marvelCharacters.data), (err, fd) => {
                        if(err)
                            throw new Error(`Couldn't write the cache file ${cachePath}`);
                        else{
                            console.log(`MarvelCharacters written to cache file ${cachePath}`);
                        }
                    });
                }
            });
        });
    }
    else{
        fs.readFile(cachePath, (err, data) => {
            if(err)
                throw new Error(`Couldn't read the cache file ${cachePath}`);
            else{
                marvelCharacters.data = JSON.parse(data.toString());
                marvelCharacters.ready = true;
                console.log(`MarvelCharacters read from cache file ${cachePath}`);
            }
        });
    }
});

module.exports = {
    marvelCharacters,
    getMarvelCharacters,
    calculateRarity,
    determineRarityColors,
};
