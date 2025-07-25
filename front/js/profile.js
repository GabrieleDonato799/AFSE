/**
 * @module front/js/profile
 * @description Manage the user's profile including deletion.
 */

let user_id = localStorage.getItem("user_id");
let params = new URLSearchParams(window.location.search);
let selectFavHero = document.getElementById("inputFavHero");
let formNick = document.getElementById("formNick");
let formEmail = document.getElementById("formEmail");
let formOldPwd = document.getElementById("formOldPwd");
let formNewPwd = document.getElementById("formNewPwd");
let user = null;

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Fetches the user's data and shows the current nickname and email on the page.
 */
async function getUserData(){
    fetch(`${url_backend}/account`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    user = json;
                    // notice that the mail is in the new email field
                    formEmail.newemail.value = user.email;
                    formNick.newnick.value = user.nick;
                    selectFavHero.value = user.favhero;
                    console.log(json); 
                });
            }
            else{
                console.log("Couldn't fetch the user's data");
            }
        })
        .catch(_ => console.error(_));
}

/**
 * Takes the url and options and returns true if the request succeded, false otherwise. On error it shows alerts to the user with the "user/dev friendly" error reported by the server. Updates the user data stored in the "user" variable.
 * @param {*} url 
 * @param {*} options 
 * @returns {boolean}
 */
async function commonFetch(url, options){
    let res = false;
    if(!user) return res;
    try{
        const response = await fetch(url, options)
        if(response.ok){
            response.json().then(json => {
                setUserFeedbackAlert(`${json.error}`, true, 5000, colorClass="alert-success");
            }).catch(_ => console.error(_));
            res = true;
        }
        else{
            const error = await response.json().catch(_ => console.error(_));;
            throw new Error(`${error.error}`);
        }
    }
    catch(e){
        console.error(e);
        setUserFeedbackAlert(`Something went wrong, please retry later<br>${e.message}`, true, 5000, colorClass="alert-danger");
        res = false;
    }
    finally{
        getUserData();
        return res;
    }
}

function changeNick() {
    const options = {
        credentials: 'include',
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "newnick": formNick.newnick.value,
        })
    };

    commonFetch(`${url_backend}/account/changenick`, options);
}

function changeFavHero() {
    const options = {
        credentials: 'include',
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "newfavhero": selectFavHero.value,
        })
    };

    commonFetch(`${url_backend}/account/changefavhero`, options);
}

function changeEmail() {
    const options = {
        credentials: 'include',
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "oldemail": user.email,
            "newemail": formEmail.newemail.value,
        })
    };

    commonFetch(`${url_backend}/account/changeemail`, options)
}

function changePwd() {
    const options = {
        credentials: 'include',
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "email": user.email,
            "oldpwd": formOldPwd.oldpassword.value,
            "newpwd": formNewPwd.newpassword.value
        })
    };

    commonFetch(`${url_backend}/account/changepwd`, options);
}

/**
 * Deletes the user's account, if the operation succeeds the user is redirected up to the index page.
 */
async function deleteAccount() {
    const options = {
        credentials: 'include',
        method: 'DELETE',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "email": user.email,
            "password": formDelete.password.value,
        })
    };

    let res = await commonFetch(`${url_backend}/account`, options);
    if(res){
        setTimeout(() => {
            window.location.href = `login.html?logout=y`;
        }, 1250);
    }
}

getUserData();
getSelectableCharactersName();
