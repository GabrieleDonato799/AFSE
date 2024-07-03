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
        }else{
            navbar.innerHTML = "ERROR: Couldn't fetch the navbar";
        }
    });