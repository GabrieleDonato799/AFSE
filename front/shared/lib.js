/**
 * @module shared/lib
 * @description Common utilities.
 */

// FRONTEND ONLY
if(globalThis.window !== undefined){
    // colors used to distinguish the cards selected for an exchange both in the album and exchange pages.
    const style = window.getComputedStyle(document.body);
    const SELECTED_OFFERED_COLOR = style.getPropertyValue('--selected-offered-card');
    const SELECTED_WANTED_COLOR = style.getPropertyValue('--selected-wanted-card');
    // const UNSELECTED_COLOR = "#d71714"

    /**
     * Takes the element containing the supercard (supercard-xxxxxx) and the new color.
     * Returns whether it succeeded or not.
     * @param {Element}
     * @param {string}
     * @returns {boolean}
     */
    function setColor(card, color){
        card.style.backgroundColor = color;
    }

    // /**
    //  * Takes the element of a supercard and its superhero's id, determines the color based on if it is selected or not, rarity and so on.
    //  */
    function adjustCardColor(card, id){
        if(exchangeState.contains(id, "wanted"))
            setColor(card, SELECTED_WANTED_COLOR);
        else if(exchangeState.contains(id, "offered"))
            setColor(card, SELECTED_OFFERED_COLOR);
    }
}

// FRONTEND & BACKEND

const url_backend = "http://localhost:3005"
const MAX_SELECTED_CARDS_EXCHANGE_PER_OP = 4;
const optionsGET = {
    method: 'GET',
    headers: {
        "Content-Type": "application/json"
    },
};

(function(exports){
    exports.url_backend = url_backend;
    exports.MAX_SELECTED_CARDS_EXCHANGE_PER_OP = MAX_SELECTED_CARDS_EXCHANGE_PER_OP;
    exports.optionsGET = optionsGET;

    /**
     * A memoized function never repeats the same calculations twice. Takes a function and returns its memoized wrapper.
     * @param {*} fn
     * @returns {function(...args)}
     */
    exports.memoize = function (fn) {
        var cache = [];
        return function(...args) {
            if(cache[args] == undefined){
                cache[args] = fn(...args);
            }
            return cache[args];
        }
    }

    /**
     * Checks if the password conforms to the adopted format, returns true if it does, false otherwise.
     * It doesn't support passphrases.
     * @param {string} pwd 
     * @returns {boolean}
     */
    exports.checkPassword = function (pwd){
        pwd = String(pwd);

        if(pwd.length < 8) return false;
        if(pwd.includes("")) return false;
    }

    /**
     * Takes a number and a precision, rounds up to 10*precision
     * @param {number} num The number to round
     * @param {number} precision
     * @author Andrew Marshall https://stackoverflow.com/a/5191133/22721622
     * @author Gabriele Donato
     */
    exports.roundUp = function (num, precision) {
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
    exports.binarySearchRight = function (array, value){
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
     * Represents the state of the current exchange with the offered and wanted supercards. Is meant to manage character ids of the superheros from the Marvel API.
     * The state is stored in the LocalStorage as exchangeState key.
     */
    exports.ExchangeState = class {
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
                throw Error("ExchangeState accepts only numbers");
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

            this.#updateState(state);
        }

        sizeOffered() {
            return this.size("offered");
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
})(typeof exports === 'undefined'? this['lib']={}: exports);