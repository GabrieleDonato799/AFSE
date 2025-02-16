// const { url_backend, optionsGET } = require("./lib");

var navbar = document.getElementById("navbar");

fetch("navbar.html")
    .then(response => {
        if(response.ok){
            response.text().then(text => {
                navbar.innerHTML = text;
                let navLinks = navbar.getElementsByClassName("nav-link");
                let current = window.location.href;
                console.log(current);

                for(let link of navLinks){
                    if(link.href === current){
                        link.classList.add("active");
                        link.setAttribute("aria-current", "page");
                    }
                }

                hideLoginIfLogged();
            });

            getUserBalance();
        }else{
            navbar.innerHTML = "ERROR: Couldn't fetch the navbar";
        }
    });

async function hideLoginIfLogged(){
    const regTab = document.getElementById('registerTab');
    const logTab = document.getElementById('loginTab');
    const unlogTab = document.getElementById('logoutTab');
    
    if(localStorage.getItem('user_id') !== null){
        unlogTab.classList.remove('d-none');
    }
    else{
        logTab.classList.remove('d-none');
        regTab.classList.remove('d-none');
    }
}

async function getUserBalance(){
    fetch(`${url_backend}/account/balance/${localStorage.getItem("user_id")}`, optionsGET)
        .then(response => {
            let counter = document.getElementById("coins-counter");
            if(response.ok){
                response.json().then(json => {
                    counter.innerHTML = json.balance; 
                });
            }
            else{
                counter.innerHTML = "0";
                console.log("Couldn't fetch the user's balance");
            }
        });
}
