let user_id = localStorage.getItem("user_id");

if(user_id === undefined) throw new Error("Unauthorized");

/**
 * Asks the backend to generate a packet, if that succeeds it reloads the user's balance. 
 */
function openPacket(){
    fetch(`${url_backend}/packets`, optionsGET)
        .then(response => {
            response.json().then(json => {
                if(response.ok){
                    setUserFeedbackAlert("Successfully purchased!");
                    getUserBalance();
                }
                else{
                    setUserFeedbackAlert(json.error);
                }
                console.log(json);
            })
        }).catch(_ => console.log(_));
}