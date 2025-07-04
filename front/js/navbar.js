/**
 * @module js/navbar
 * @description Management of the navigation bar.
 */

var navbar = document.getElementById("navbar");
var userFeedbackAlert = document.getElementById("userFeedbackAlert");
var coinsCounter = document.getElementById("coins-counter");

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
        let navItems = navbar.getElementsByClassName("nav-item");
        logTab.classList.remove('d-none');
        regTab.classList.remove('d-none');

        // hide all routes in the navigation bar that can't be accessed without being authenticated
        for(let link of navItems){
            if(!['loginTab', 'registerTab'].includes(link.id)){
                link.classList.add("d-none");
            }
        }
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

    fetch(`${url_backend}/account/balance`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    updateCoinsCounter(coinsCounter, json.balance);
                })
                .catch(_ => console.log(_));
            }
            else{
                updateCoinsCounter(coinsCounter, 0);
                console.log("Couldn't fetch the user's balance");
            }
        }).catch(_ => console.log(_));
}

/**
 * Takes the navbar' counter element and the new balance to show.
 * @param {Element} counterE
 * @param {number} balance
 */
function updateCoinsCounter(counterE, balance){
    counterE.innerHTML = `<strong>${balance} coins</strong>`;
    counterE.parentElement.classList.remove('d-none');
}

/**
 * Takes a message and whether to move the view to the alert. The message will override the one in the navbar' user alert.
 * @param {string} message
 * @param {bool} moveView
 * @param {number} timeout The time after which the alert is hidden
 */
function setUserFeedbackAlert(message, moveView=true, timeout=5000){
    userFeedbackAlert.innerHTML = message;
    if(moveView){
        setVisibleUserFeedbackAlert(true);
        window.location.hash = '#userFeedbackAlert';
    }
    if(timeout){
        setTimeout(() => {
            setVisibleUserFeedbackAlert(false);
        }, timeout);
    }
}

/**
 * Takes a message to be appended to the one in the navbar' user alert.
 * The message is place in a newline except if the alert is empty.
 * @param {string} message
 * @param {bool} moveView
 */
function appendUserFeedbackAlert(message, moveView=true){
    if(userFeedbackAlert.innerHTML !== "")
        userFeedbackAlert.innerHTML += '<br>';
    userFeedbackAlert.innerHTML += message;
    if(moveView){
        setVisibleUserFeedbackAlert(true);
        window.location.hash = '#userFeedbackAlert';
    }
}

/**
 * Takes a boolean.
 * @param {boolean} bool
 */
function setVisibleUserFeedbackAlert(bool){
    bool ? userFeedbackAlert.classList.remove('d-none') : userFeedbackAlert.classList.add('d-none');
}
