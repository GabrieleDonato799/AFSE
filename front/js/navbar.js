/**
 * @module js/navbar
 * @description Management of the navigation bar.
 */

var navbar = document.getElementById("navbar");
var userFeedbackAlert = document.getElementById("userFeedbackAlert");
var coinsCounter = document.getElementById("coins-counter");
var coinsBalance = 0; // Used to enforce limits by the client

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
        setUsersNick();
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
                .catch(_ => console.error(_));
            }
            else{
                updateCoinsCounter(coinsCounter, 0);
                console.log("Couldn't fetch the user's balance");
            }
        }).catch(_ => console.error(_));
}

/**
 * Takes the navbar' counter element and the new balance to show.
 * @param {Element} counterE
 * @param {number} balance
 */
function updateCoinsCounter(counterE, balance){
    coinsBalance = balance;
    counterE.innerHTML = `<strong>${balance} coins</strong>`;
    counterE.parentElement.classList.remove('d-none');
}

/**
 * Sets the current user's nickname on the navbar.
 * Takes the nick from the localstorage if the user is logged in, this is meant to be called from ifLogged().
 */
async function setUsersNick(){
    const nickElem = document.getElementById("user-nick");

    const nick = localStorage.getItem("user_nick");
    nickElem.innerHTML = `<b>Welcome back ${nick}!</b>`;
    nickElem.parentNode.classList.remove('d-none');
}

/**
 * The message will override the one in the navbar' user alert.
 * @param {string} message
 * @param {bool} moveView Whether to move the viewport to the alert, the alert is visible only if this is true 
 * @param {number} timeout The time after which the alert is hidden
 * @param {string} colorClass A Bootstrap 5 color class
 */
function setUserFeedbackAlert(message, moveView=true, timeout=5000, colorClass){
    setUserFeedbackAlertColor(colorClass);
    userFeedbackAlert.innerHTML = message;
    if(moveView){
        setVisibleUserFeedbackAlert(true);
        moveViewUserFeedbackAlert();
    }
    if(timeout){
		setTimeoutUserFeedbackAlert(timeout);
	}
}

/**
 * Takes a message to be appended to the one in the navbar' user alert.
 * The message is place in a newline except if the alert is empty.
 * @param {string} message
 * @param {bool} moveView Whether to move the viewport to the alert, the alert is visible only if this is true 
 * @param {number} timeout The time after which the alert is hidden
 * @param {string} colorClass A Bootstrap 5 color class

 */
function appendUserFeedbackAlert(message, moveView=true, timeout, colorClass){
    setUserFeedbackAlertColor(colorClass);
    if(userFeedbackAlert.innerHTML !== "")
        userFeedbackAlert.innerHTML += '<br>';
    userFeedbackAlert.innerHTML += message;
    if(moveView){
        setVisibleUserFeedbackAlert(true);
        moveViewUserFeedbackAlert();
    }
	if(timeout){
		setTimeoutUserFeedbackAlert(timeout);
	}
}

/**
 * Takes a boolean.
 * @param {boolean} bool
 */
function setVisibleUserFeedbackAlert(bool){
    bool ? userFeedbackAlert.classList.remove('d-none') : userFeedbackAlert.classList.add('d-none');
}

function moveViewUserFeedbackAlert(){
    window.location.hash = '#notifyError';
}

function setTimeoutUserFeedbackAlert(timeout=5000){
    if(timeout){
        setTimeout(() => {
            setVisibleUserFeedbackAlert(false);
        }, timeout);
    }
}

/**
 * Takes a Bootstrap 5 alert color class, removes all the others on the alert and applies the given class.
 * @param {string} colorClass
 */
function setUserFeedbackAlertColor(colorClass="alert-danger"){
    userFeedbackAlert.classList.remove('alert-primary');
    userFeedbackAlert.classList.remove('alert-secondary');
    userFeedbackAlert.classList.remove('alert-success');
    userFeedbackAlert.classList.remove('alert-danger');
    userFeedbackAlert.classList.remove('alert-warning');
    userFeedbackAlert.classList.remove('alert-info');
    userFeedbackAlert.classList.remove('alert-light');
    userFeedbackAlert.classList.remove('alert-dark');

    userFeedbackAlert.classList.add(colorClass);
}
