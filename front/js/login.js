/**
 * @module front/login
 */

const params = new URLSearchParams(window.location.search);
let form = document.getElementById("loginForm");
let alert = document.getElementById("loginAlert");

if(params.get("logout") !== null){
    logout();
}

/**
 * Checks if the details inserted in the login form are correct, if not it triggers allerts and disables submission.
 * Returns whether the details are correct or not.
 * @returns {boolean} 
 */
function checkDetails(){
    let correct = true;
    alert.innerHTML = "";

    if(form.email.value === ""){
        alert.innerHTML += "Inserisci l'e-mail!<br>";
        correct = false;
    }
    if(form.password.value === ""){
        alert.innerHTML += "Inserisci la password!<br>";
        correct = false;
    }

    if(!correct)
        alert.classList.remove("d-none");
    else
        alert.classList.add("d-none");

    return correct;
}

/**
 * Attempts to login the user.
 * If it doesn't succeed it will trigger allerts to the user.
 * Assume it doesn't return a value
 */
function login() {
    const options = {
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
                alert.classList.remove("d-none");
                alert.innerHTML = `${response.error}`;
            }else{
                localStorage.setItem("user_id", response.id);
                window.location.href = "index.html";
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
    window.location.href = "index.html";
}