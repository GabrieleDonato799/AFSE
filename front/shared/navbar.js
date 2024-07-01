var navbar = document.getElementById("navbar");
		
fetch("navbar.html")
    .then(response => {
        if(response.ok){
            response.text().then(text => {
                navbar.innerHTML = text;
            });
        }else{
            navbar.innerHTML = "ERROR: Couldn't fetch the navbar";
        }
    });