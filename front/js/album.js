/**
 * @module front/album
 */
const MAX_SELECTED = 4;
const PAGE_SIZE = 20;
/**
 * Contains the id and respective Supercard objects of the currently displayed supercards, this makes calling their tweaking methods easier when selling instead of removing all cards and re-fetching them.
 */
const displayedSupercards = {};
/**
 * Pages are calculated when the server replies with the info about the album. They are shown to start from 1 instead of 0.
 */
var page = 0;
var N_PAGES = 0;
let user_id = localStorage.getItem("user_id");
let userAlbum = undefined;
let params = new URLSearchParams(window.location.search);
let op = params.get("op");

// This prevents that multiple fetches of the page will continuosly visibly override the cards contents. Only the fetch response that corresponds to the last timestamp of fetch will be applied. This is just a counter incremented at every fetch of a page.
let pageFetchTS = 0;

if(exchangeState.checkOp(op)){
    document.getElementsByName("exchange_button").forEach((elem) => elem.classList.remove("d-none"));
}
else{
    document.getElementsByName("sell_button").forEach((elem) => elem.classList.remove("d-none"));
}

if(user_id === undefined) throw new Error("Unauthorized");

function nextPage(){
    if(page < N_PAGES){
        page += 1;
        showSupercards(userAlbum.fullAlbum);
    }
    updatePageBtns(page);
}

function toPage(pg){
    if(0 < pg && pg < N_PAGES){
        page = pg;
        showSupercards(userAlbum.fullAlbum);
    }
    updatePageBtns(page);
}

function previousPage(){
    if(page > 0){
        page -= 1;
        updatePageBtns(page);
        showSupercards(userAlbum.fullAlbum);
    }
}

/**
 * Updates the page changing buttons with the current page, disables one of them if on the respective boundary of the album.
 * Also updates the sell button when cards are selected or less.
 */
function updatePageBtns(page){
    let nextBtns = document.getElementsByName("next_page_button");
    let prevBtns = document.getElementsByName("prev_page_button");
    let sellBtns = document.getElementsByName("sell_button");

    // the pages are shown to start from 1
    prevBtns.forEach(btn => {
        btn.innerHTML = "<b>Previous"+ (page -1 >= 0 ? ` - ${page}` : '') +"</b>";
    });
    nextBtns.forEach(btn => {
        btn.innerHTML = "<b>Next"+ (page +1 < N_PAGES ? ` - ${page +2}` : '') +"</b>";
    });

    // Disable buttons if where are on the album boundaries
    if(page < N_PAGES){
        nextBtns.forEach(btn => {
            btn.removeAttribute("disabled");
        });
    }
    else{
        nextBtns.forEach(btn => {
            btn.setAttribute("disabled", "");
        });
    }

    if(page > 0){
        prevBtns.forEach(btn => {
            btn.removeAttribute("disabled");
        });
    }
    else{
        prevBtns.forEach(btn => {
            btn.setAttribute("disabled", "");
        });
    }

    // Disable the sell buttons if no cards are selected
    if(sellState.isEmpty()){
        sellBtns.forEach(btn => {
            btn.setAttribute("disabled", "");
        });
    }
    else{
        sellBtns.forEach(btn => {
            btn.removeAttribute("disabled");
        });
    }
}

/**
 * Takes a full album and adds supercards to the DOM. Cards that are not yet collected are shown gray.
 * @param {Response} response 
 */
function showSupercards(album){
    const card = document.getElementById('supercard');
    const container = document.getElementById('container');
    container.innerHTML = "";
    container.append(card);
    const pgsize = Math.min(album.length, (page+1)*PAGE_SIZE);
    const placeHolderCharacter = {
        id: 0,
        name: "Still coming!",
        thumbnail: "img/missing-card.jpg",
        rarity: "000000"
    }

    pageFetchTS += 1;
    const thisPageFetchTS = pageFetchTS;

    // delete all currently displayed Supercard objects
    Object.keys(displayedSupercards).forEach(k => delete displayedSupercards[k]);

    for (i = page*PAGE_SIZE; i < pgsize; i++) {
        const thatI = i; // i changes during the fetch call and its resolution, this way we know that in its context we have a fixed value.
        displayedSupercards[`${album[thatI]}`] = new Supercard(placeHolderCharacter, container, card);

        // query the superhero
        fetch(`${url_backend}/characters/${album[i]}`, optionsGET)
            .then(res => res.json()
                .then(json => {
                    if(json.error) console.error(`Server error: ${json.error}`);
                    else{
                        if(thisPageFetchTS === pageFetchTS){
                            displayedSupercards[`${album[thatI]}`].setSuperhero(json);
                            if(userAlbum.supercards.includes(album[thatI]))
                                displayedSupercards[`${album[thatI]}`].albumTweaks();
                            else
                                displayedSupercards[`${album[thatI]}`].albumMissingTweaks();
                        }
                    }
                })
            )
            .catch(_ => console.error(_));
    }
}

/**
 * Retrieves the user's album from the backend, takes a function to call to which it will pass the album.
 * @param {function (album)} action
 */
async function getUserAlbum(action){
    await fetch(`${url_backend}/album`, optionsGET)
        .then(album => {
            if(album.ok){
                album.json().then(json => {
                    userAlbum = json;
                    // precalculate the sorted set of all cards, missing and collected
                    userAlbum.fullAlbum = userAlbum.supercards.concat(userAlbum.missing).sort((a, b) => {return a < b ? -1 : (a == b ? 0 : 1)});
                    if(action)
                        action(userAlbum);
                })
            }
        })
        .catch(_ => console.log(_));
}

/**
 * Takes the user's album returned from the "/album/:uid" endpoint and updates the progress bar.
 * @param {Object} album
 */
function updateProgress(album){
    const albumProgress = document.getElementById('albumProgress');
    let progressBar = albumProgress.children[0];

    albumProgress.attributes['aria-valuenow'].value = album.collected;
    albumProgress.attributes['aria-valuemax'].value = album.total;
    progressBar.style.width = `${(album.collected/album.total)*100}%`
    progressBar.innerText = `${album.collected}/${album.total}`;

    albumProgress.classList.remove('d-none');  
}

/**
 * Callback to select a card to be exchanged.
 */
function select(callingElem){
    let sid;

    sid = Number(callingElem.id.split("-")[1]);
    selectId(callingElem, sid);
    adjustCardColor(callingElem, sid);
}

/**
 * Takes the element which was selected by the user and it's superhero's numeric id. The id is added to the correct state depending on the context.
 * The calling element is needed to verify integrity.
 * If the "op" query parameter is set it goes to the exchangeState otherwise to the sellState.
 * Does not change the color of the supercard.
 * @param {number} sid
 */
function selectId(callingElem, sid){
    // prevent interference between selling and exchanging cards features
    if(
        (!sellState.isEmpty() && exchangeState.checkOp(op)) ||
        (!exchangeState.isEmpty() && !exchangeState.checkOp(op))
    ) {
        setUserFeedbackAlert("Can't both exchange and sell.<br>Exchange, sell or deselect everything.");
        return;
    };

    if(callingElem.classList.contains('missing-card') && op !== "wanted"){
        setUserFeedbackAlert("You don't have that card!");
        return;
    }

    if(!callingElem.classList.contains('missing-card') && op == "wanted"){
        setUserFeedbackAlert("You can't want something you already have!");
        return;
    }

    if(exchangeState.checkOp(op)){
        // op contains a valid operation ("wants"|"offers")
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
                setUserFeedbackAlert(`You can't select more than ${MAX_SELECTED_CARDS_EXCHANGE_PER_OP} cards to exchange (per side).`);
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
                setUserFeedbackAlert(`You can't select more than ${MAX_SELECTED_CARDS_TO_SELL} cards to sell.`);
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
        "credentials": 'include',
        "method": "PUT",
        "body": JSON.stringify({
            cids: sellState.cards
        }),
        "headers": {
            "Content-Type": "application/json",
        }
    };

    fetch(`${url_backend}/album/sell`, options)
        .then(res => {
            res.json().then(json => {
                if(res.ok){
                    console.log(`I've deleted ${sellState.cards}`);
                    sellState.cards.forEach(cid => {
                        try{
                            displayedSupercards[`${cid}`].albumMissingTweaks();
                        }
                        catch(e){
                            // this fails when we want to sell a card which is not in the current page
                            console.log(e);
                        }
                    });
                    sellState.clear();
                    updateCoinsCounter(coinsCounter, json.balance);
                    getUserAlbum((album) => {
                        updateProgress(album);
                    });

                    // window.location.href = window.location.href;
                }
                else{
                    console.error(json.error);
                    sellState.clear();
                }
            });
        })
        .catch(_ => {
            console.error(_);
            sellState.clear();
        });
}

/**
 * Takes a superhero's id and removes the corresponding card from the page layout.
 * @param {number/string} sid 
 */
// function removeCard(sid){
// 	let card = document.getElementById(`supercard-${sid}`);
// 	if(card)
// 		card.remove();
// }

getUserAlbum(function processUserAlbum(album){
    N_PAGES = Math.round(userAlbum.fullAlbum.length/PAGE_SIZE);
    updatePageBtns(page);
    showSupercards(album.fullAlbum);
    updateProgress(album);
});
