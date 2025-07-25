/**
 * @module front/js/login
 * @description Login form validation and submission, client side logout procedure.
 */

const params = new URLSearchParams(window.location.search);
let form = document.getElementById("loginForm");

if(params.get("logout") !== null){
    logout();
}

/**
 * Checks if the details inserted in the login form are correct, if not it triggers an alert and disables the form submission.
 * Returns whether the details are correct or not.
 * @returns {boolean} 
 */
function checkDetails(){
    let correct = true;
    setUserFeedbackAlert("");

    if(form.email.value === ""){
        appendUserFeedbackAlert("Inserisci l'e-mail!");
        correct = false;
    }
    if(form.password.value === ""){
        appendUserFeedbackAlert("Inserisci la password!");
        correct = false;
    }

    setVisibleUserFeedbackAlert(!correct);

    return correct;
}

/**
 * Attempts to login the user.
 * If it doesn't succeed it will trigger the feedback alert.
 * Doesn't return a value
 */
function login() {
    const options = {
        credentials: 'include',
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "email": form.email.value,
            "password": form.password.value
        })
    };

    if(!checkDetails()) return false;

    fetch(`${url_backend}/account/login`, options)
        .then(response => response.json())
        .then(response => {
            if(response.id === undefined){
                setVisibleUserFeedbackAlert(true);
                setUserFeedbackAlert(`${response.error}`);
            }else{
                localStorage.setItem("user_id", response.id);
                localStorage.setItem("user_nick", response.nick);
                if(localStorage.getItem("showPossessedCards") === null)
                    localStorage.setItem("showPossessedCards", true);
                if(localStorage.getItem("showMissingCards") === null)
                    localStorage.setItem("showMissingCards", true);
                exchangeState.clear();
                sellState.clear();
                window.location.href = "album.html";
            }
        })
        .catch(err => console.error(err));
}

/**
 * Logs out the user, always succeeds.
 * Doesn't return a value.
 */
function logout(){
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_nick");
    exchangeState.clear();
    sellState.clear();
    window.location.href = "login.html";

    let optionsDELETE = structuredClone(optionsGET);
    optionsDELETE.method = 'DELETE';
    fetch(`${url_backend}/account/logout`, optionsDELETE)
        .then(response => {
            console.log(response);
            if(!response.ok)
                setUserFeedbackAlert('Error during logout, try later or manually delete the cookies otherwiser you won\'t be signed out!.');
        })
        .catch(_ => console.error(_));
}
