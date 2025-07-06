/**
 * @module front/js/supercard
 * @description Retrieves the superhero information and displays it on the "card details" page.
 */

let params = new URLSearchParams(window.location.search);
let missingDescription = "Unfortunately, only Marvel knows about this one...";

/**
 * Takes the character as returned from the Marvel API (data.result) and the type of content to display ("comics"/"series"/"events"), creates six cards of the specified content and adds them to the page. Doesn't return a value.
 * @param {*} character 
 * @param {string} type "comics"/"series"/"events"
 */
async function showContent(character, type){
    if(typeof(type) !== "string") {console.log(`[showContent] invalid type`); return;}
    if(!character[type].available) return;
    // the container is only used to hide or show the content with the "d-none" class
    let container = document.getElementById(`${type}-container`);
    let originalCard = document.getElementById(type);
    
    // retrieve the content and add a card asynchronously
    fetch(`${url_backend}/characters/${character.id}/${type}`, optionsGET)
    .then(res => {
        if(res.ok){
            res.json()
                .then(json => {
                    let content = json.results;

                    for(let i=0; i<6 && i<content.length; i++){
                        let card = originalCard.cloneNode(true);
                        let description = content[i].description;

                        // skip those with "image not found"
                        if(content[i].thumbnail.path === "http://i.annihil.us/u/prod/marvel/i/mg/b/40/image_not_available") continue;

                        card.id = `${type}-${i}`;
                        card.getElementsByClassName("card-title")[0].innerText = `${content[i].title}`;
                        card.getElementsByClassName("card-img")[0].src = `${content[i].thumbnail.path}.${content[i].thumbnail.extension}`;
                        if(description !== null)
                            card.getElementsByClassName("card-text")[0].innerText = `${content[i].description}`;
                        else
                            card.getElementsByClassName("card-text")[0].innerText = missingDescription;
                        card.classList.remove('d-none');
                        originalCard.parentNode.insertBefore(card, null);
                    }

                    if(content.length > 0)
                        container.classList.remove('d-none');
                })
                .catch(_ => console.error(_));
        }
    }).catch(err => console.error(err));
}

/**
 * Takes a character id (from Marvel API), fetches and shows to the page layout the character supercard and the comics, series and events associated.
 * @param {string} cid
 */
function getContent(cid){
    fetch(`${url_backend}/characters/${cid}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    // console.log(`[getContent] cid: ${cid}`);
                    showSupercard(json);
                    showContent(json, "comics");
                    showContent(json, "series");
                    showContent(json, "events");
                })
                .catch(_ => console.error(_));
            }else{
                response.json().then(error => {
                    console.log(`Invalid character ${error.error}`);
                })
                .catch(_ => console.error(_));
            }
        }).catch(_ => console.error(_));
}

/**
 * Takes a superhero from the Marvel API and adds its supercard to the page layout.
 * @param {Object} superhero 
 */
function showSupercard(superhero){
    let card = document.getElementById('supercard');
    let card_description_container = document.getElementById("card_description");
    let card_description_text = card_description_container.getElementsByClassName('card-text')[0];
    
    if(superhero.description)
        card_description_text.innerText = `${superhero.description}`;
    else
        card_description_text.innerText = missingDescription;
    
    console.log(superhero);
    const s = new Supercard(superhero, card.parentNode, card);
    s.carddetailsTweaks();

    card_description_container.classList.remove('d-none');
}

getContent(params.get("cid"));
