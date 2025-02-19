/**
 * @module front/exchange
 */

var page = 1;
var pageSize = 100;
var user_id = localStorage.getItem("user_id");
var userAlbum = undefined;
let exchangeState = new lib.ExchangeState();
var card = document.getElementById('supercard');

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Fetches the user's album and shows the cards on the page layout.
 */
async function getUserAlbum(){
    await fetch(`${url_backend}/album/${user_id}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    userAlbum = json['supercards'];
                    showSupercards(userAlbum);
                })
            }
        });
}

/**
 * Adds an offered card to the left area.
 */
function addOffered(){
    window.location.href = "album.html?op=offered";
}

/**
 * Adds a wanted card to the right area.
 */
function addWanted(){
    window.location.href = "album.html?op=wanted";
}

/**
 * Exchanges the selected cards.
 * Doesn't return a value.
 */
function exchange(){
    if(!exchangeState.isComplete()){
        console.log("Exchange is not complete!");
        return;
    }

    const options = {
        "method": "POST",
        "body": JSON.stringify({
            offerer: localStorage.getItem("user_id"),
            wanter: null,
            offers: exchangeState.offered,
            wants: exchangeState.wanted
        }),
        "headers": {
            "Content-Type": "application/json",
            "Accepts": "application/json"
        }
    };

    fetch(`${url_backend}/exchange/trade`, options)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    clearState();
                    console.log(json);
                    getTrades();
                })
            }
        });
}

/**
 * Clears all the selected cards.
 */
function clearState(){
    for(let id of exchangeState.offered){
        document.getElementById(`supercard-offered-${id}`).remove();
    }
    for(let id of exchangeState.wanted){
        document.getElementById(`supercard-wanted-${id}`).remove();
    }

    exchangeState.clear();

    hideAddingCards();
}

/**
 * Show the current offered and wanted cards
 */
function showState(){
    showSelectedCards(exchangeState.offered, "offered");
    showSelectedCards(exchangeState.wanted, "wanted");
    hideAddingCards();
}

/**
 * Swap the offered cards with the wanted ones.
 */
function swapState(){
    for(let id of exchangeState.offered){
        document.getElementById(`supercard-offered-${id}`).remove();
    }
    for(let id of exchangeState.wanted){
        document.getElementById(`supercard-wanted-${id}`).remove();
    }
    exchangeState.swap();
    showState();
}

/**
 * Takes the array of cards' id to show and the operation associated to determine if they are offered or wanted, asks the backend for the data to show.
 * Doesn't return anything.
 * @param {Array} cards 
 * @param {string} op 
 */
function showSelectedCards(cards, op){
    let container = document.getElementById(`container_${op}`);

    for(let cid of cards){
        fetch(`${url_backend}/characters/${cid}`, optionsGET)
            .then(response => {
                if(response.ok){
                    response.json().then(json => {
                        if(Object.keys(json).length === 0) return;

                        let superhero = json;
                        let clone = card.cloneNode(true);
                        clone.id = `supercard-${op}-` + cid;

                        title = clone.getElementsByClassName('card-title')[0];
                        overview = clone.getElementsByClassName('card-text')[0];
                        image = clone.getElementsByClassName('card-img-top')[0];
                        button = clone.getElementsByClassName('btn-primary')[0];

                        title.innerHTML = superhero.name;
                        image.src = superhero['thumbnail'];

                        // set the rarity color on the supercard
                        // clone.style.backgroundColor = `#${superhero.rarity}`;
                        clone.style.backgroundColor = "#1aa3ff";
                        
                        clone.classList.remove('d-none')
                        container.appendChild(clone);
                    })
                }
            });
    }
}

/**
 * Removes the card.
 * @param {Element} callingElem 
 */
function remove(callingElem){
    let operation = callingElem.parentNode.id.split("-")[1];
    let hero_id = Number(callingElem.parentNode.id.split("-")[2]);
    let cards = exchangeState[operation];

    callingElem.parentNode.remove();
    // The required method name is extracted from the capitalized
    // card id
    exchangeState.remove(operation, hero_id);

    hideAddingCards();
}

/**
 * Returns the string with the first letter capitalized.
 * @param {string} string 
 * @returns {string}
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Hides the plus '+' cards that give the user the ability to add cards to the state.
 */
function hideAddingCards(){
    if(exchangeState.sizeOffered() >= MAX_SELECTED_CARDS_EXCHANGE_PER_OP){
        document.getElementById("supercard_offered").classList.add("d-none");
    }else{
        document.getElementById("supercard_offered").classList.remove("d-none");
    }

    if(exchangeState.sizeWanted() >= MAX_SELECTED_CARDS_EXCHANGE_PER_OP){
        document.getElementById("supercard_wanted").classList.add("d-none");
    }else{
        document.getElementById("supercard_wanted").classList.remove("d-none");
    }
}

/**
 * Fetches all the users trades and shows them to the page layout.
 */
function getTrades(){
    fetch(`${url_backend}/exchange/trades/${user_id}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    showTrades(json);
                })
            }
        });
}

/**
 * Takes the array of users traders and shows them to the page layout.
 * @param {Array} trades 
 */
function showTrades(trades){
    let template = document.getElementById("template_trade");
    let cont = template.parentNode;

    // clean before inserting
    cont.innerHTML = "";
    cont.appendChild(template);

    for(let trade of trades){   
        let clone = template.cloneNode(true);

        let titleButton = clone.getElementsByTagName("button")[0];
        let body = clone.getElementsByClassName("accordion-body")[0];
        let id = trade._id;

        // display the data of the trade
        titleButton.innerHTML = id;
        body.innerHTML = trade.offerer+"<br>";
        body.innerHTML += trade.wanter+"<br>";
        for(let o of trade.offers)
            body.innerHTML += o+"<br>";
        for(let w of trade.wants)
            body.innerHTML += w+"<br>";

        // fix the accordion's collapse id
        
        clone.getElementsByClassName("accordion-collapse")[0].id = `${id}`;
        titleButton.attributes.getNamedItem("data-bs-target").value = `#${id}`;
        titleButton.attributes.getNamedItem("aria-controls").value = `${id}`;

        clone.classList.remove("d-none");

        template.parentNode.appendChild(clone);
    }
}

showState();
getTrades();

