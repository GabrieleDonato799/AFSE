/**
 * @module shared/lib
 * @description Common utilities.
 */

// FRONTEND & BACKEND

const url_backend = "http://localhost:3005"
const MAX_SELECTED_CARDS_EXCHANGE_PER_OP = 4;
const MAX_SELECTED_CARDS_TO_SELL = 8;
const MAX_BALANCE = 99999
const optionsGET = {
    credentials: 'include',
    method: 'GET',
    headers: {
        "Content-Type": "application/json"
    },
};

/**
 * A memoized function never repeats the same calculations twice. Takes a function and returns its memoized wrapper.
 * @param {*} fn
 * @returns {function(...args)}
 */
function memoize(fn) {
    var cache = [];
    return function(...args) {
        if(cache[args] == undefined){
            cache[args] = fn(...args);
        }
        return cache[args];
    }
}

/**
 * Takes a number and a precision, rounds up to 10*precision
 * @param {number} num The number to round
 * @param {number} precision
 * @author Andrew Marshall https://stackoverflow.com/a/5191133/22721622
 * @author Gabriele Donato
 */
function roundUp(num, precision) {
    precision = Math.pow(10, precision)
    return Math.ceil(num / precision) * precision
}

/**
 * Uses the binary search algorithm, then approximates to the higher value in the array.
 * Returns the index of next value in the array bigger than the input value, if all the values are smaller, it returns the index of the biggest of them. 
 * @param {Array} array 
 * @param {Number} value 
 * @returns {Number}
 */
function binarySearchRight(array, value){
    let max = array.length -1, min = 0;
    let ptr;

    // Requires the first value to be 0.0,
    // otherwise it wont ever return the first intended value
    array.concat([0.0], array);

    do{
        ptr = Math.floor((max + min)/2);
        if(value > array[ptr]){
            min = ptr;
        }else{
            max = ptr;
        }
        // the value should be between two array indexes
        // in the case these are the same, stop aniway
    }while(max - min > 1); 

    return max;
}

/**
 * Sorts the element inside the supplied supercards container.
 * https://stackoverflow.com/a/50127768/22721622
 * @param {Element} container 
 */
function sortSupercardsById(container){
    [...container.children]
    .sort((a, b) => a.id > b.id ? 1 : -1)
    .forEach(node => container.appendChild(node));
}

/**
 * Represents the state of the current exchange with the offered and wanted supercards. Is meant to manage character ids of the superheros from the Marvel API.
 * The state is stored in the LocalStorage as exchangeState key.
 */
class ExchangeState{
    constructor() {
        // If not existant it gets created
        this.#retrieveState();
    }

    get offered(){
        let state = this.#retrieveState();
        return [...state.offered];
    }

    get wanted(){
        let state = this.#retrieveState();
        return [...state.wanted];
    }

    /**
     * takes an array and puts it in place of the offered supercards returns whether it was successful.
     * @param {Array} ids
     * @returns {boolean}
     */
    set offered(ids){
        if(typeof(ids) === "object"){
            let state = this.#retrieveState();
            state.offered = new Set();
            this.#updateState(state);

            for(let id of ids){
                this.addOffered(id);
            }
        }else
            return false;
        
        return true;
    }

    /**
     * takes an array and puts it in place of the wanted supercards returns whether it was successful.
     * @param {Array} ids
     * @returns {boolean}
     */
    set wanted(ids){
        if(typeof(ids) === "object"){
            let state = this.#retrieveState();
            state.wanted = new Set();
            this.#updateState(state);

            for(let id of ids){
                this.addWanted(id);
            }
        }else
            return false;
        
        return true;
    }

    /**
     * Takes an id and returns whether the operation was successful.
     * @param {Number} id
     * @returns {boolean}
     */
    addOffered(id){
        return this.add("offered", id);
    }

    
    /**
     * Takes an id and returns whether the operation was successful.
     * @param {Number} id
     * @returns {boolean}
     */
    addWanted(id){
        return this.add("wanted", id);
    }

    /**
     * Takes the operation ("wanted"/"offered") and the id of the superhero to add. Comodity method.
     * @param {string} op "wanted"/"offered"
     * @param {Number} id
     * @returns {boolean}
     */
    add(op, id){
        if(!this.checkOp(op)) throw Error("Invalid operation");
        
        let state = this.#retrieveState();
        
        if(typeof(id) !== "number"){
            throw Error("ExchangeState accepts only numbers");
        }
        
        state[op].add(id);
        return this.#updateState(state);
    }

    /**
     * Takes an id and returns whether the operation was successful.
     * @param {Number} id 
     * @returns {boolean}
     */
    removeOffered(id){
        return remove("offered", id);
    }

    /**
     * Takes an id and returns whether the operation was successful.
     * @param {Number} id 
     * @returns {boolean}
     */
    removeWanted(id){
        return remove("wanted", id);
    }

    /**
     * Takes the operation ("wanted"/"offered") and the id of the superhero to remove. Comodity method.
     * @param {string} op "wanted"/"offered"
     * @param {Number} id 
     * @returns {boolean}
     */
    remove(op, id){
        if(!this.checkOp(op)) throw Error("Invalid operation");

        let state = this.#retrieveState();

        if(typeof(id) !== "number"){
            throw Error("ExchangeState accepts only numbers");
        }

        state[op].delete(id);
        return this.#updateState(state);
    }

    /**
     * Takes the superhero id, operation and returns whether the superhero is contained in the state.
     * Notice that the order of the parameters is swapped as opposed to other methods.
     * @param {Number} id
     * @param {string} op
     * @returns {boolean}
     */
    contains(id, op="both"){
        let state = this.#retrieveState();

        if(typeof(id) !== "number"){
            throw Error("ExchangeState accepts only numbers, received: " + typeof(id));
        }

        if(op === "both")
            return (state["wanted"].has(id) || state["offered"].has(id));
        else if(!this.checkOp(op)) throw Error("Invalid operation");
            return state[op].has(id);
    }

    /**
     * Swaps the cards offered with the wanted ones, returns true if successful false otherwise.
     * @returns {boolean}
     */
    swap(){
        let state = this.#retrieveState();

        let t = state.wanted;
        state.wanted = state.offered;
        state.offered = t;

        return this.#updateState(state);
    }

    /**
     * Clears the state, less prone to errors than using the offered and wanted properties alone
     * @returns {boolean}
     */
    clear(){
        let state = this.#retrieveState();

        state.offered = new Set();
        state.wanted = new Set();

        return this.#updateState(state);
    }

    sizeOffered() {
        return this.size("offered");
    }

    isEmpty(){
        let state = this.#retrieveState();

        return (this.sizeWanted() === 0 && this.sizeOffered() === 0);
    }

    sizeWanted() {
        return this.size("wanted");
    }

    /**
     * Takes the operation ("wanted"/"offered") and returns the size of the respective set of superhero ids. Comodity method
     * @param {string} op "wanted"/"offered"
     * @returns {Number}
     */
    size(op){
        if(!this.checkOp(op)) throw Error("Invalid operation");
        
        let state = this.#retrieveState();
        return state[op].size;
    }

    /**
     * An exchange is complete if the user has selected both an offering and a wanted card.
     * @returns {boolean}
     */
    isComplete(){
        let state = this.#retrieveState();

        return (state.offered.size > 0 && state.wanted.size > 0);
    }

    /**
     * Returns a deep copy of the exchangeState in LocalStorage with js.
     * Sets to prevent duplicating supercard.
     * @returns {boolean}
     */
    #retrieveState(){
        let state = localStorage.getItem("exchangeState");
        
        if(state === undefined || state === null){
            localStorage.setItem("exchangeState", JSON.stringify({
                offered: [],
                wanted: []
            }));
            state = {
                offered: new Set(),
                wanted: new Set()
            }
        }else{
            let _state = JSON.parse(state);
            state = {
                offered: new Set([..._state.offered]),
                wanted: new Set([..._state.wanted])
            }
        }

        return state;
    }

    /**
     * Tries to update the state and returns if it was successful.
     * Takes the state from the #retrieveState method.
     * @param {Object} state
     * @returns {boolean} 
     */
    #updateState(state){
        if(state === undefined || state === null){
            return false;
        }

        // Integrity checks
        for(let e of state.offered){
            if(state.wanted.has(e)){
                return false;
            }
        }

        localStorage.setItem("exchangeState", JSON.stringify({
            offered: [...state.offered],
            wanted: [...state.wanted]
        }));

        return true;
    }

    /**
     * Tells whether the specified operation is supported.
     * @param {string} op 
     * @returns {boolean}
     */
    checkOp(op){
        if(op === "wanted" || op === "offered")
            return true;
        return false;
    }
}

/**
 * Represent the currently selected-for-sale cards 
 */
class SellState {
    constructor() {
        // If not existant it gets created
        this.#retrieveState();
    }

    get cards(){
        let state = this.#retrieveState();
        return [...state.cards];
    }

    /**
     * takes an array and puts it in place of the offered supercards returns whether it was successful.
     * @param {Array} ids
     * @returns {boolean}
     */
    set cards(ids){
        if(typeof(ids) === "object"){
            let state = this.#retrieveState();
            state.cards = new Set();
            this.#updateState(state);

            for(let id of ids){
                this.add(id);
            }
        }else
            return false;
        
        return true;
    }

    /**
     * Takes the id of the superhero to add, returns whether it succeeded.
     * @param {Number} id
     * @returns {boolean}
     */
    add(id){
        let state = this.#retrieveState();
        
        if(typeof(id) !== "number"){
            throw Error("SellState accepts only numbers");
        }
        
        state.cards.add(id);
        return this.#updateState(state);
    }

    /**
     * Takes the id of the superhero to remove, returns whether it succeded.
     * @param {Number} id 
     * @returns {boolean}
     */
    remove(id){
        let state = this.#retrieveState();

        if(typeof(id) !== "number"){
            throw Error("SellState accepts only numbers");
        }

        state.cards.delete(id);
        return this.#updateState(state);
    }

    /**
     * Takes the superhero id and returns whether the superhero is contained in the state.
     * @param {Number} id
     * @returns {boolean}
     */
    contains(id){
        let state = this.#retrieveState();

        if(typeof(id) !== "number"){
            throw Error("SellState accepts only numbers");
        }
        
        return state.cards.has(id);
    }

    /**
     * Clears the state
     * @returns {boolean}
     */
    clear(){
        let state = this.#retrieveState();

        state.cards = new Set();

        return this.#updateState(state);
    }

    isEmpty(){
        return (this.size() === 0);
    }

    /**
     * Returns the amount of superhero ids selected.
     * @returns {Number}
     */
    size(){
        let state = this.#retrieveState();
        return state.cards.size;
    }

    /**
     * Returns a deep copy of the exchangeState in LocalStorage with js.
     * Sets to prevent duplicating supercard.
     * @returns {boolean}
     */
    #retrieveState(){
        let state = localStorage.getItem("sellState");
        
        if(state === undefined || state === null){
            localStorage.setItem("sellState", JSON.stringify({
                cards: []
            }));
            state = {
                cards: new Set()
            }
        }else{
            let _state = JSON.parse(state);
            state = {
                cards: new Set([..._state.cards])
            }
        }

        return state;
    }

    /**
     * Tries to update the state and returns if it was successful.
     * @param {Object} state
     * @returns {boolean} 
     */
    #updateState(state){
        if(state === undefined || state === null){
            return false;
        }

        localStorage.setItem("sellState", JSON.stringify({
            cards: [...state.cards],
        }));

        return true;
    }
}

/**
     * Represent a supercard template element.
     * For every page a method can be added to customize the supercard as needed.
     */
class Supercard {
    /**
     * Initializes the card by setting the title, description, image, color, rarity color.
     * NOTE: The customs() function works because the inner variables of this function are left global.
     * @param {JSON} superhero data retrieved from our API
     * @param {Element} container cards container != Bootstrap container
     * @param {Element} supercard tag with id="supercard-xxxxxx"
     * @param {string} operation 'wanted'/'offered'
     * @param {function} customs function that is executed to customized this initialization
     */
    constructor(superhero, container, supercard, operation=null) {
        this.container = container;
        this.operation = operation;

        this.clone = supercard.cloneNode(true);
        this.title = this.clone.getElementsByClassName('card-title')[0];
        this.overview = this.clone.getElementsByClassName('card-text')[0];
        this.image = this.clone.getElementsByClassName('card-img-top')[0];
        this.button = this.clone.getElementsByClassName('btn-primary')[0];
        this.footer = this.clone.getElementsByClassName('card-footer')[0];
        this.rarityButton = this.clone.getElementsByClassName('rarity-button')[0];

        this.setSuperhero(superhero);
    }

    /**
     * Takes a superhero's JSON and updates the card's properties
     * @param {*} superhero 
     */
    setSuperhero(superhero){
        this.superhero = superhero;

        if(this.operation)
            this.clone.id = `supercard-${this.operation}-${this.superhero.id}`;
        else
            this.clone.id = `supercard-${this.superhero.id}`;

        this.title.innerHTML = this.superhero.name;
        this.image.src = this.superhero['thumbnail'];
    
        // set the rarity color on the supercard
        this.rarityButton.style.backgroundColor = `#${this.superhero.rarity}`;
        adjustCardColor(this.clone, this.superhero.id);
    }

    /**
     * Adds the supercard to the container, makes it selectable and visible.
     */
    #show(){
        // makes it selectable
        setClickSelectEvtListener(this.clone);

        this.clone.classList.remove('d-none');
        // card.before(this.clone);
        this.container.appendChild(this.clone);
        sortSupercardsById(this.container);
    }

    albumTweaks(){
        this.detailsButton = this.footer.getElementsByClassName('details-button')[0];
        this.detailsButton.search = `?cid=${this.superhero.id}`;
        this.#show();
    }

    albumMissingTweaks(){
        this.clone.classList.add('missing-card');
        this.detailsButton = this.footer.getElementsByClassName('details-button')[0];
        this.detailsButton.classList.add('d-none');
        this.rarityButton.classList.add('d-none');
        this.image.src = 'img/missing-card.jpg';
        this.#show();
    }

    exchangeTweaks(){
        this.deleteBtn = this.clone.getElementsByClassName('remove-button')[0];
        this.deleteBtn.classList.remove('d-none');
        this.#show();
    }

    exchangeWantedTweaks(){
        this.deleteBtn = this.clone.getElementsByClassName('remove-button')[0];
        this.detailsButton = this.footer.getElementsByClassName('details-button')[0];
        
        this.clone.classList.add('missing-card');
        this.rarityButton.classList.add('d-none');
        // move the delete button to the right
        this.deleteBtn.parentNode.classList.remove("justify-content-between");
        this.deleteBtn.parentNode.classList.add("justify-content-end");
        this.deleteBtn.classList.remove('d-none');
        this.detailsButton.classList.add('d-none');
        this.image.src = 'img/missing-card.jpg';
        this.#show();
    }

    carddetailsTweaks(){
        // the description box must be after the supercard
        this.container.insertBefore(this.clone, this.container.firstChild);
        // albumTweaks
        let rarityParent = this.rarityButton.parentNode;
        rarityParent.classList.remove("justify-content-between");
        rarityParent.classList.add("justify-content-end");
        this.detailsButton = this.footer.getElementsByClassName('details-button')[0];
        this.detailsButton.remove();
        // this.detailsButton.search = `?cid=${this.superhero.id}`;

        // #show
        setClickSelectEvtListener(this.clone);
        this.clone.classList.remove('d-none');
    }
}

// FRONTEND ONLY
if(globalThis.window !== undefined){
    // colors used to distinguish the cards selected for an exchange both in the album and exchange pages.
    
    var exchangeState = new ExchangeState();
    var sellState = new SellState();

    /**
     * Takes the element containing the supercard (supercard-xxxxxx) and the new color.
     * Returns whether it succeeded or not.
     * @param {Element}
     * @param {string}
     * @returns {boolean}
     */
    // function setColor(card, color){
    // 	card.style.backgroundColor = color;
    // }

    /**
     * Takes the element of a supercard and its superhero's id, determines the color based on if it is selected or not
     */
    function adjustCardColor(card, id){
        if(exchangeState.contains(id, "wanted"))
            card.classList.add('wanted-card');
        else if(exchangeState.contains(id, "offered"))
            card.classList.add('offered-card');
        else if(sellState.contains(id)){
            let path = window.location.pathname;
            // the exchange.html exclusion is actually enforced in the callbacks to select a card.
            if(!(path.includes('carddetails.html') || path.includes('exchange.html')))
                card.classList.add('sell-card');
            // if the flow arrives here, the color should be correct anyway as it is imposed in the colorpalette stylesheet.
        }
        else{
            clearColorClasses(card);
        }
    }

    function clearColorClasses(card){
        card.classList.remove('wanted-card');
        card.classList.remove('offered-card');
        card.classList.remove('sell-card');
    }

    /**
     * Takes a card and adds it the event listener that makes it selectable to be sold or exchanged.
     * @param {Element} card
     */
    function setClickSelectEvtListener(card){
        card.addEventListener('click', (event) => {
            if(!event.target.classList.contains('btn')){
                select(event.currentTarget); // pass the whole supercard
            }
        });
    }

    /**
     * Fetches the characters' name to show in the favorite superhero select.
     */
    function getSelectableCharactersName(){
        fetch(`${url_backend}/characters/names`, optionsGET)
        .then(response => {
            if(response.ok){
                response.json().then(json => {
                    let names = JSON.parse(json);
                    let select = document.getElementById("inputFavHero");
                    names.forEach(name => {
                        let op = document.createElement("option");
                        op.innerText = name;
                        select.appendChild(op); 
                    });
                })
            }else{
                response.json().then(err => {
                    setUserFeedbackAlert("Couldn't fetch the superheroes names. Please note you can select your favorite superhero later in the settings.");
					console.error(err)
                })
            }
        }).catch(err => {
            setUserFeedbackAlert("Something went wrong, please retry later");
			console.error(err);
        });
    }
}

// BACKEND ONLY
(function(exports){
    exports.url_backend = url_backend;
    exports.MAX_SELECTED_CARDS_EXCHANGE_PER_OP = MAX_SELECTED_CARDS_EXCHANGE_PER_OP;
    exports.MAX_SELECTED_CARDS_TO_SELL = MAX_SELECTED_CARDS_TO_SELL;
    exports.optionsGET = optionsGET;

    exports.memoize = memoize;
    exports.roundUp = roundUp;
    exports.binarySearchRight = binarySearchRight;
    exports.SellState = SellState;
    exports.ExchangeState = ExchangeState;
})(typeof exports === 'undefined'? this['lib']={}: exports);
