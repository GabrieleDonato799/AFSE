/**
 * @module front/register
 */

let form = document.getElementById("registerForm");
let submit = document.getElementById("registerSubmit");

getSelectableCharactersName();

/**
 * Checks if the details inserted in the register form are correct, if not it triggers bootstrap' alerts.
 * Returns whether details are correct or not.
 * @returns {boolean}
 */
function checkDetails(){
    let correct = true;
    setUserFeedbackAlert("", false, 0);

    if(!form.nick.value){
        appendUserFeedbackAlert("Missing nickname!", false, 0, "alert-danger");
        correct = false;
    }

    if(form.email.value !== form.emailConfirm.value){
        appendUserFeedbackAlert("The emails don't match!", false, 0, "alert-danger");
        correct = false;
    }
    if(form.password.value !== form.passwordConfirm.value){
        appendUserFeedbackAlert("The passwords don't match!", false, 0, "alert-danger");
        correct = false;
    }

    if(!correct){
        setVisibleUserFeedbackAlert(true);
		setTimeoutUserFeedbackAlert(5000);
        moveViewUserFeedbackAlert();
    }

    return correct;
}

/**
 * Attempts to register the user, if it fails the user is informed by bootstrap' alerts. If the registration succeeds the user is automatically redirected to the index.
 * Assume it doesn't return a value.
 */
function register() {
    const options = {
        credentials: 'include',
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "nick": form.nick.value,
            "email": form.email.value,
            "password": form.password.value,
            "favhero": form.favHero.value
        })
    };

    if(!checkDetails()) return false;

    fetch(`${url_backend}/account/register`, options)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    localStorage.setItem("user_id", json._id);
                    localStorage.setItem("user_nick", json.nick);
                    exchangeState.clear();
                    sellState.clear();

                    setUserFeedbackAlert("Successfully registered!", true, 5000, "alert-success");
                    
                    setTimeout(() => {
                        window.location.href = "album.html";
                    }, 1250);
                })
            }else{
                response.json().then(error => {
                    setUserFeedbackAlert(`${error.error}`, true, 5000, "alert-danger");
                })
            }
        }).catch(err => {
            setUserFeedbackAlert(`Something went wrong, please retry later`, true, 5000, "alert-danger");
			console.log(err);
        });
}
