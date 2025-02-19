/**
 * @module front/register
 */

let form = document.getElementById("registerForm");
let alert = document.getElementById("registerAlert");
let submit = document.getElementById("registerSubmit");

/**
 * Checks if the details inserted in the register form are correct, if not it triggers bootstrap' alerts.
 * Returns whether details are correct or not.
 * @returns {boolean}
 */
function checkDetails(){
    let correct = true;
    alert.innerHTML = "";

    if(!form.nick.value){
        alert.innerHTML += "Missing nickname!<br>";
        correct = false;
    }

    if(form.email.value !== form.emailConfirm.value){
        alert.innerHTML += "The emails don't match!<br>";
        correct = false;
    }
    if(form.password.value !== form.passwordConfirm.value){
        alert.innerHTML += "The passwords don't match!<br>";
        correct = false;
    }

    if(!correct){
        alert.classList.remove("d-none");
    }else{
        alert.classList.add("d-none");
    }

    return correct;
}

/**
 * Attempts to register the user, if it fails the user is informed by bootstrap' alerts. If the registration succeeds the user is automatically redirected to the index.
 * Assume it doesn't return a value.
 */
function register() {
    const options = {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "nick": form.nick.value,
            "email": form.email.value,
            "password": form.password.value
        })
    };

    if(!checkDetails()) return false;

    fetch(`${url_backend}/account/register`, options)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    localStorage.setItem("user_id", json._id);

                    alert.innerHTML = "Successfully registered!";
                    alert.classList.add("alert-success");
                    alert.classList.remove("alert-danger");
                    alert.classList.remove("d-none");
                    
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1250);
                })
            }else{
                response.json().then(error => {
                    alert.innerHTML = `${error.error}<br>`;
                    alert.classList.remove("d-none");
                })
            }
        }).catch(err => {
            alert.innerHTML = `Something went wrong, please retry later`;
            alert.classList.remove("d-none");
        });
}