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
    document.getElementById("exchange_button").classList.remove("d-none");
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
 * Takes a fetch()' response and adds supercards to the DOM.
 * @param {Response} response 
 */
function showSupercards(response){
    card = document.getElementById('supercard');
    container = document.getElementById('container');
    container.innerHTML = "";
    container.append(card);

    for (i = page*PAGE_SIZE; i < Math.min(response.length, (page+1)*PAGE_SIZE); i++) {
        let hero_id = response[i];

        // query the superhero
        fetch(`${url_backend}/characters/${hero_id}`, optionsGET)
            .then((res) => {
                res.json().then((superhero) => {
                    console.log(superhero);
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
                    clone.style.backgroundColor = "#1aa3ff";

                    clone.classList.remove('d-none')
                    card.before(clone)
                });
            });
    }
}
/**
 * Retrieves the user's album from the backend
 */
async function getUserAlbum(){
    await fetch(`${url_backend}/album/${user_id}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
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
    if(!exchangeState.checkOp(op)) return;

    let size = exchangeState.size(op);
    
    if(size < MAX_SELECTED_CARDS_EXCHANGE_PER_OP){
        let idToAdd = Number(callingElem.id.split("-")[1]);

        exchangeState.add(op, idToAdd);
    }else{
        // Error
    }
}

/**
 * Sends back to the exchange page the selected cards
 */
function backToExchange(){
    if(!exchangeState.checkOp(op)) return;
    window.location.href = `exchange.html`;
}

getUserAlbum();