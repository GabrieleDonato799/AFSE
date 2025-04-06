let user_id = localStorage.getItem("user_id");

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Asks the backend to generate a packet, if that succeeds it reloads the user's balance. 
 */
function openPacket(){
    fetch(`${url_backend}/packets`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    if(!json.error)
                        getUserBalance();
                    console.log(json);
                })
            }
        }).catch(_ => console.log(_));
}