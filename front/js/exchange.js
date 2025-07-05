/**
 * @module front/exchange
 */

var page = 1;
var pageSize = 100;
var user_id = localStorage.getItem("user_id");
var userAlbum = undefined;
var card = document.getElementById('supercard');
let clearBtn = document.getElementById('clearBtn');
let exchangeBtn = document.getElementById('exchangeBtn');

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Fetches the user's album and shows the cards on the page layout.
 */
async function getUserAlbum(){
    await fetch(`${url_backend}/album`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json()
                    .then(json => {
                        userAlbum = json['supercards'];
                        showSupercards(userAlbum);
                    })
                    .catch(_ => console.error(_));
            }
        })
        .catch(_ => console.error(_));
}

/**
 * Adds an offered card to the left area.
 */
function addOffered(){
    if(!sellState.isEmpty()){
        setUserFeedbackAlert("Can't both exchange and sell");
    }
    else{
        // console.log(sellState.isEmpty());
        window.location.href = "album.html?op=offered";
    }
}

/**
 * Adds a wanted card to the right area.
 */
function addWanted(){
    if(!sellState.isEmpty()){
        setUserFeedbackAlert("Can't both exchange and sell");
    }
    else{
        window.location.href = "album.html?op=wanted";
    }
}

/**
 * Updates the "exchange" and "clear" buttons depending on the presence or less of cards
 */
function updateTradeBtns(){
    exchangeState.isEmpty() ? clearBtn.setAttribute('disabled', '') : clearBtn.removeAttribute('disabled');
    exchangeState.isComplete() ? exchangeBtn.removeAttribute('disabled') : exchangeBtn.setAttribute('disabled', '');
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
        "credentials": 'include',
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
            response.json()
                    .then(json => {
                        clearState();
                        if(response.ok){
                            console.log(json);
                            getTrades();	
                        }
                        setUserFeedbackAlert(json.error, true, 5000, colorClass="alert-success");
                    })
                    .catch(_ => console.error(_));
        })
        .catch(_ => console.error(_));
}

/**
 * Clears all the selected cards.
 */
function clearState(){
    // if the user is faster than the page loads, we'll try to delete non-existant elements, so try-catch them.
    for(let id of exchangeState.offered){
        try{
            document.getElementById(`supercard-offered-${id}`).remove();
        }
        catch(e){console.error(e)};
    }
    for(let id of exchangeState.wanted){
        try{
            document.getElementById(`supercard-wanted-${id}`).remove();
        }
        catch(e){console.error(e)};
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
    updateTradeBtns();
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
                    response.json()
                        .then(json => {
                            if(Object.keys(json).length === 0) return;
                            s = new Supercard(json, container, card, op);
                            
                            if(op === "wanted")
                                s.exchangeWantedTweaks()
                            else if(op === "offered")
                                s.exchangeTweaks();
                        })
                        .catch(_ => console.error(_));
                }
            })
            .catch(_ => console.error(_));
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
    updateTradeBtns();
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
    fetch(`${url_backend}/exchange/trades`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json()
                    .then(json => {
                        showTrades(json);
                    })
                    .catch(_ => console.error(_));
            }
        }).catch(_ => console.error(_));
}

/**
 * Removes a trade
 */
function removeTrade(callingElem, tradeId){
    let optionsDELETE = structuredClone(optionsGET);
    optionsDELETE.method = "DELETE";
 
    console.log(tradeId);

    fetch(`${url_backend}/exchange/trade/${tradeId}`, optionsDELETE)
        .then(response => {
            if(response.ok){
                response.json()
                    .then(json => {
                        console.log(json);
                        appendUserFeedbackAlert(json.error, true, 5000, colorClass="alert-success");
                        getTrades();
                    })
            }else{
                response.json()
                    .then(json => {
                        setUserFeedbackAlert(json.error);
                })
            }
        })
        .catch(_ => {console.error(_)});
}

/**
 * Takes the array of users traders and shows them to the page layout.
 * @param {Array} trades 
 */
function showTrades(trades){
    let template = document.getElementById("template_trade");
    let cont = template.parentNode; // id="container_trades"

    // clean before inserting
    cont.innerHTML = "";
    cont.appendChild(template);

    let N=0; // number of the trade to display
    for(let trade of trades){
        ++N;
        let clone = template.cloneNode(true);
        let deleteTradeBtn = clone.getElementsByClassName("delete-trade-btn")[0];

        let titleButton = clone.getElementsByTagName("button")[0]; // class="accordion-button"
        // let body = clone.getElementsByClassName("accordion-body")[0];
        let tradeBody = clone.getElementsByClassName("trade-body")[0];
        let id = trade._id;

        // display the data of the trade
        if(trade.matched){
            titleButton.innerHTML = `<span class="text-white"><b>Trade #${N}: </b> MATCHED</span>`;
        }else{
            titleButton.innerHTML = `<span class="text-warning"><b>Trade #${N}: </b> WAITING TO BE MATCHED</span>`;
        }
        
        tradeBody.innerHTML = "";
        tradeBody.innerHTML += "<b>YOU offered:</b><br>";
        for(let o of trade.offers_names)
            tradeBody.innerHTML += o+"<br>";
        tradeBody.innerHTML += "<b>YOU wanted:</b><br>";
        for(let w of trade.wants_names)
            tradeBody.innerHTML += w+"<br>";

        // fix the accordion's collapse id
        clone.getElementsByClassName("accordion-collapse")[0].id = `${id}`;
        titleButton.attributes.getNamedItem("data-bs-target").value = `#${id}`;
        titleButton.attributes.getNamedItem("aria-controls").value = `${id}`;

        // fix the delete trade button
        if(trade.matched){
            deleteTradeBtn.parentNode.remove();
        }else{
            deleteTradeBtn.setAttribute("onclick", `removeTrade(this, "${id}");`);
        }

        clone.classList.remove("d-none");

        template.parentNode.appendChild(clone);
    }
}

showState();
getTrades();

