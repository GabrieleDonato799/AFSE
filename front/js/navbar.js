/**
 * @module js/navbar
 * @description Management of the navigation bar.
 */

var navbar = document.getElementById("navbar");
// It's global to let other js scripts modify the counter.
// It is first set by the callback of the fetch after this declaration.
var coinsCounter;

fetch("navbar.html")
    .then(response => {
        if(response.ok){
            response.text().then(text => {
                navbar.innerHTML = text;
                coinsCounter = document.getElementById("coins-counter");
                let navLinks = navbar.getElementsByClassName("nav-link");
                let current = window.location.href;
                console.log(current);

                for(let link of navLinks){
                    if(link.href === current){
                        link.classList.add("active");
                        link.setAttribute("aria-current", "page");
                    }
                }

                ifLogged();
            });
        }else{
            navbar.innerHTML = "ERROR: Couldn't fetch the navbar";
        }
    });

/**
 * Logic to apply if the user is logged in.
 * - Hides the login and register tabs in the navbar otherwise it shows the logout one.
 * - Gets the user balance.
 */
async function ifLogged(){
    const regTab = document.getElementById('registerTab');
    const logTab = document.getElementById('loginTab');
    const unlogTab = document.getElementById('logoutTab');
    
    if(localStorage.getItem('user_id') !== null){
        unlogTab.classList.remove('d-none');
        getUserBalance();
    }
    else{
        logTab.classList.remove('d-none');
        regTab.classList.remove('d-none');
    }
}

/**
 * Fetches the logged in user's balance and updates the navbar coins counter.
 */
async function getUserBalance(){
    // check if user is logged in 
    if(!localStorage.getItem("user_id")){
        updateCoinsCounter(coinsCounter, 0);
    }

    fetch(`${url_backend}/account/balance/${localStorage.getItem("user_id")}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    updateCoinsCounter(coinsCounter, json.balance);
                });
            }
            else{
                updateCoinsCounter(coinsCounter, 0);
                console.log("Couldn't fetch the user's balance");
            }
        });
}

/**
 * Takes the navbar' counter element and the new balance to show.
 * @param {Element} counterE
 * @param {number} balance
 */
function updateCoinsCounter(counterE, balance){
    counterE.innerHTML = `${balance} coins`;
    counterE.parentElement.classList.remove('d-none');
}