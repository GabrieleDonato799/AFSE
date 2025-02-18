let params = new URLSearchParams(window.location.search);

// Takes the character and the type of content to display ("comics"/"series"/"events"), creates six cards of the specified content and adds them to the page.
async function showContent(character, type){
    if(typeof(type) !== "string") {console.log(`[showContent] invalid type`); return;}
    if(!character[type].available) return;
    let container = document.getElementById(`${type}-container`);
    let originalCard = document.getElementById(type);

    container.classList.remove('d-none');
    
    // retrieve the content and add a card asynchronously
    fetch(`${url_backend}/characters/${character.id}/${type}`, optionsGET)
    .then(res => {
        if(res.ok){
            content = res.json()
                .then(json => {
                    console.log(json);
                    let content = json.results;

                    for(let i=0; i<6 && i<content.length; i++){
                        let card = originalCard.cloneNode(true);
                        let description = content[i].description;

                        card.id = `${type}-${i}`;
                        card.getElementsByClassName("card-title")[0].innerText = `${content[i].title}`;
                        card.getElementsByClassName("card-img-top")[0].src = `${content[i].thumbnail.path}.${content[i].thumbnail.extension}`;
                        if(description !== null)
                            card.getElementsByClassName("card-text")[0].innerText = `${content[i].description}`;
                        card.classList.remove('d-none');
                        originalCard.parentNode.insertBefore(card, null);
                    }
                });
            }
        }).catch(err => console.error(err));
}

function getContent(cid){
    fetch(`${url_backend}/characters/${cid}`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    // This could be parallelized!
                    console.log(`[getContent] cid: ${cid}`);
                    console.log(json);
                    showSupercard(json);
                    showContent(json, "comics");
                    showContent(json, "series");
                    showContent(json, "events");
                })
            }else{
                response.json().then(error => {
                    console.log(`Invalid character ${error.error}`);
                })
            }
        }).catch(err => {
        });
}

function showSupercard(superhero){
    let card = document.getElementById('supercard');
    card.id = 'supercard-' + superhero.id;

    let title = card.getElementsByClassName('card-title')[0];
    let overview = card.getElementsByClassName('card-text')[0];
    let image = card.getElementsByClassName('card-img-top')[0];
    let button = card.getElementsByClassName('btn-primary')[0];
    let footer = card.getElementsByClassName('card-footer')[0];
    let card_description = document.getElementById("card_description");
    
    title.innerHTML = superhero.name;
    // console.log(`[showSupercard] superhero['thumbnail']:`);
    // console.log(superhero['thumbnail']);
    image.src = superhero['thumbnail'];
    footer.firstElementChild.search = `?cid=${superhero.id}`;
    card_description.innerText = `${superhero.description}`;

    // set the rarity color on the supercard
    // card.style.backgroundColor = `#${superhero.rarity}`;
    card.style.backgroundColor = "#1aa3ff";

    card.classList.remove('d-none')
}

getContent(params.get("cid"));