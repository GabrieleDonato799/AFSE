/**
 * @module front/credits
 */

let user_id = localStorage.getItem("user_id");
let params = new URLSearchParams(window.location.search);

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Takes the offers to buy coins or packets and adds them to the page layout.
 * @param {Array} offers
 */
function showOffers(offers){
    const card = document.getElementById('template_card');

    for(let offer of offers) {
        if(offer.type !== "coins") continue;

        console.log(offer);
        const clone = card.cloneNode(true);
        clone.id = 'offer-' + offer._id;
        
        const title = clone.getElementsByClassName('card-title')[0];
        const amount = clone.getElementsByClassName('card-text')[0];
        // const button = clone.getElementsByClassName('btn')[0];
        const img = clone.getElementsByClassName('card-img-top')[0];

        title.innerHTML = offer.title;
        amount.innerHTML = `${offer.amount} coins for ${offer.price} credits`;
        const imgName = (offer.title).replaceAll(" ", "_");
        img.src = `img/${imgName}.png`;

        clone.classList.remove('d-none')
        card.before(clone)
    }
}

/**
 * Retrieves all the offers for coins or packets and shows them on the page layout.
 */
async function getOffers(){
    await fetch(`${url_backend}/offers`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {;
                    showOffers(json.offers);
                })
            }
        })
        .catch(_ => console.log(_));
}

/**
 * Sends back to the exchange page the selected cards. 
 */
function backToExchange(){
    if(!exchangeState.checkOp(op)) return;
    window.location.href = `exchange.html`;
}

/**
 * Takes the element of the offer clicked by the user and buys it.
 * @param {Element} callingElem 
 */
function buyCoins(callingElem){
    let id = callingElem.parentNode.parentNode.parentNode.id.split("-")[1];

    const options = {
        "credentials": 'include',
        "method": "POST",
        "body": JSON.stringify(
            {id: id}  
        ),
        "headers": {
            "Content-Type": "application/json",
        }
    };

    fetch(`${url_backend}/offers/buy`, options)
        .then(response => {
            if(response.ok){
                response.json().then(json => {;
                    console.log(json);
                    getUserBalance();
                })
            }
        })
        .catch(_ => console.log(_));
}

getOffers();
