let user_id = localStorage.getItem("user_id");

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Asks the backend to generate a packet, if that succeeds it reloads the user's balance. 
 */
function openPacket(){
    fetch(`${url_backend}/packets/${user_id}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    getUserBalance();
                    console.log(json);
                })
            }
        });
}