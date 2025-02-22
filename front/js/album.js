/**
 * @module front/album
 */
const MAX_SELECTED = 4;
const PAGE_SIZE = 20;
let page = 0;
let user_id = localStorage.getItem("user_id");
let userAlbum = undefined;
let params = new URLSearchParams(window.location.search);
let op = params.get("op");
// let selected = new Set(); // eventually selected supercards for an exchange
let exchangeState = new lib.ExchangeState();
let sellState = new lib.SellState();

if(exchangeState.checkOp(op)){
    document.getElementsByName("exchange_button").forEach((elem) => elem.classList.remove("d-none"));
}

if(user_id === undefined) throw new Error("Unauthorized");

function nextPage(){
    page += 1;
    showSupercards(userAlbum);
}

function previousPage(){
    if(page > 0)
        page -= 1;
    showSupercards(userAlbum);
}

/**
 * Takes an album and adds supercards to the DOM.
 * @param {Response} response 
 */
function showSupercards(album){
    const card = document.getElementById('supercard');
    const container = document.getElementById('container');
    container.innerHTML = "";
    container.append(card);
    const pgsize = Math.min(album.length, (page+1)*PAGE_SIZE);

    for (i = page*PAGE_SIZE; i < pgsize; i++) {
        // query the superhero
        fetch(`${url_backend}/characters/${album[i]}`, optionsGET)
            .then(res => res.json()
                .then(json => {
                    json.error ? console.error(`Server error: ${json.error}`) : showSupercardsClbk(json, container, card);
                })
            )
            .catch(err => console.error());
    }
}

function showSupercardsClbk(superhero, container, card){
    // console.log(superhero);
    clone = card.cloneNode(true);
    clone.id = 'supercard-' + superhero.id;

    title = clone.getElementsByClassName('card-title')[0];
    overview = clone.getElementsByClassName('card-text')[0];
    image = clone.getElementsByClassName('card-img-top')[0];
    button = clone.getElementsByClassName('btn-primary')[0];
    footer = clone.getElementsByClassName('card-footer')[0];

    title.innerHTML = superhero.name;
    image.src = superhero['thumbnail'];
    footer.firstElementChild.search = `?cid=${superhero.id}`;

    // set the rarity color on the supercard
    // clone.style.backgroundColor = `#${superhero.rarity}`;
    adjustCardColor(clone, superhero.id);

    clone.classList.remove('d-none');
    card.before(clone);
}

/**
 * Retrieves the user's album from the backend
 */
async function getUserAlbum(){
    await fetch(`${url_backend}/album/${user_id}`, optionsGET)
        .then(album => {
            if(album.ok){
                album.json().then(json => {
                    userAlbum = json;
                    showSupercards(userAlbum);
                })
            }
        });
}

/**
 * Callback to select a card to be exchanged.
 */
function select(callingElem){
    let sid = Number(callingElem.id.split("-")[1]);
    selectId(sid);
    adjustCardColor(callingElem, sid);
}

/**
 * Takes a superhero's numeric id and adds it to the correct state depending on the context.
 * If the "op" query parameter is set it goes to the exchangeState otherwise to the sellState.
 * Does not change the color of the supercard.
 * @param {number} sid
 */
function selectId(sid){
    if(exchangeState.checkOp(op)){
        let size = exchangeState.size(op);
        if(exchangeState.contains(sid)){
            // remove it
            exchangeState.remove(op, sid);
        }
        else{
            // add it
            if(size < MAX_SELECTED_CARDS_EXCHANGE_PER_OP){
                exchangeState.add(op, sid);
            }else{
                // Error
            }
        }    
    }
    else{
        let size = sellState.size(op);
        if(sellState.contains(sid)){
            // remove it
            sellState.remove(sid);
        }
        else{
            // add it
            if(size < MAX_SELECTED_CARDS_TO_SELL){
                sellState.add(sid);
            }else{
                // Error
            }
        }  
    }
}

/**
 * Sends back to the exchange page the selected cards
 */
function backToExchange(){
    if(!exchangeState.checkOp(op)) return;
    window.location.href = `exchange.html`;
}

/**
 * Sells the selected cards
 */
function sell(){
    if(sellState.isEmpty()) return;
    // prevent interference with the exchange cards feature
    if(exchangeState.checkOp(op) || !exchangeState.isEmpty()) return;

    const options = {
        "method": "PUT",
        "body": JSON.stringify({
            cids: sellState.cards
        }),
        "headers": {
            "Content-Type": "application/json",
        }
    };
    let user_id = localStorage.getItem('user_id');

    fetch(`${url_backend}/album/${user_id}/sell`, options)
        .then(res => {
            res.json().then(json => {
                if(res.ok){
                    console.log(`I've deleted ${sellState.cards}`);
                    sellState.cards.forEach(cid => {
                        removeCard(cid);
                    });
                    sellState.clear();
                    updateCoinsCounter(coinsCounter, json.balance);

                    // window.location.href = window.location.href;
                }
                else{
                    console.error(json.error);
                }
            });
        })
        .catch(_ => console.error(_));
}

/**
 * Takes a superhero's id and removes the corresponding card from the page layout.
 * @param {number/string} sid 
 */
function removeCard(sid){
    let card = document.getElementById(`supercard-${sid}`);
    card.remove();
}

getUserAlbum();