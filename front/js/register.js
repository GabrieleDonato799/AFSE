let form = document.getElementById("registerForm");
let alert = document.getElementById("registerAlert");
let submit = document.getElementById("registerSubmit");

// Checks if the details inserted in the register form are correct
// otherwise it triggers user alerts
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

// If it doesn't success it will trigger alerts to the user
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