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
            });

			getUserBalance();
        }else{
            navbar.innerHTML = "ERROR: Couldn't fetch the navbar";
        }
    });

async function getUserBalance(){
	fetch(`${url_backend}/account/balance/${localStorage.getItem("user_id")}`, optionsGET)
		.then(response => {
			if(response.ok){
				response.json().then(json => {
					let counter = document.getElementById("coins-counter");
					counter.innerHTML = json.balance; 
				});
			}
			else{
				console.log("Couldn't fetch the user's balance");
			}
		});
}
