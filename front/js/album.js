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
    
    if(!exchangeState.checkOp(op)) return;

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

    adjustCardColor(callingElem, sid);
}

/**
 * Sends back to the exchange page the selected cards
 */
function backToExchange(){
    if(!exchangeState.checkOp(op)) return;
    window.location.href = `exchange.html`;
}

getUserAlbum();