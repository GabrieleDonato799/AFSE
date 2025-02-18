let user_id = localStorage.getItem("user_id");
let params = new URLSearchParams(window.location.search);

if(user_id === undefined) throw new Error("Unauthorized");

// Takes the offers to buy coins or packets and build their page layout
function showOffers(offers){
    card = document.getElementById('template_card');

    for(let offer of offers) {
        if(offer.type !== "coins") continue;

        console.log(offer);
        clone = card.cloneNode(true);
        clone.id = 'offer-' + offer._id;


        title = clone.getElementsByClassName('card-title')[0];
        amount = clone.getElementsByClassName('card-text')[0];
        button = clone.getElementsByClassName('btn')[0];

        title.innerHTML = offer.title;
        amount.innerHTML = "Amount: " + offer.amount;

        clone.classList.remove('d-none')
        card.before(clone)
    }
}

async function getOffers(){
    await fetch(`${url_backend}/offers`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {;
                    showOffers(json.offers);
                })
            }
        });
}

// Sends back to the exchange page the selected cards
function backToExchange(){
    if(!exchangeState.checkOp(op)) return;
    window.location.href = `exchange.html`;
}

function buyCoins(callingElem){
    let id = callingElem.parentNode.parentNode.parentNode.id.split("-")[1];

    const options = {
        "method": "POST",
        "body": JSON.stringify(
            {id: id}  
        ),
        "headers": {
            "Content-Type": "application/json",
        }
    };

    fetch(`${url_backend}/offers/buy/${localStorage.getItem("user_id")}`, options)
        .then(response => {
            if(response.ok){
                response.json().then(json => {;
                    console.log(json);
                    getUserBalance();
                })
            }
        });
}

getOffers();