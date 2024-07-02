const url_backend = "http://localhost:3005"
const MAX_SELECTED_CARDS_EXCHANGE_PER_OP = 4;

(function(exports){
    // A memoized function never repeats the same calculations twice
    exports.memoize = function (fn) {
        var cache = [];
        return function(...args) {
            if(cache[args] == undefined){
                cache[args] = fn(...args);
            }
            return cache[args];
        }
    }

    // Checks if the password conforms to the adopted format,
    // returns true if it does, false otherwise.
    // It doesn't support passphrases
    exports.checkPassword = function (pwd){
        pwd = String(pwd);

        if(pwd.length < 8) return false;
        if(pwd.includes("")) return false;
    }

    // Uses the binary search algorithm, then approximates
    // to the higher value in the array.
    // Returns the index of next value in the array bigger than the input value,
    // if all the values are smaller, it returns the index of the biggest of them. 
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

    // Represents the state of the current exchange with the offered
    // and wanted supercards. Is meant to manage character ids of the superheros
    // from the Marvel API.
    // The state is stored in the LocalStorage as exchangeState key
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

        // takes an array and puts it in place of the offered supercards
        // returns whether it was successful
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

        // takes an array and puts it in place of the wanted supercards
        // returns whether it was successful
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

        // Takes an id and returns whether the operation was successful
        addOffered(id){
            return this.add("offered", id);
        }

        // Takes an id and returns whether the operation was successful
        addWanted(id){
            return this.add("wanted", id);
        }

        // Takes the operation ("wanted"/"offered") and the id of the superhero
        // to add. Comodity method
        add(op, id){
            if(!this.checkOp(op)) throw Error("Invalid operation");
            
            let state = this.#retrieveState();
            
            if(typeof(id) !== "number"){
                throw Error("ExchangeState accepts only numbers");
                return false;
            }
            
            state[op].add(id);
            return this.#updateState(state);
        }

        // Takes an id and returns whether the operation was successful
        removeOffered(id){
            return remove("offered", id);
        }

        // Takes an id and returns whether the operation was successful
        removeWanted(id){
            return remove("wanted", id);
        }

        // Takes the operation ("wanted"/"offered") and the id of the superhero
        // to remove. Comodity method
        remove(op, id){
            if(!this.checkOp(op)) throw Error("Invalid operation");

            let state = this.#retrieveState();

            if(typeof(id) !== "number"){
                throw Error("ExchangeState accepts only numbers");
                return false;
            }

            state[op].delete(id);
            return this.#updateState(state);
        }

        // Swaps the cards offered with the wanted ones
        swap(){
            let state = this.#retrieveState();

            let t = state.wanted;
            state.wanted = state.offered;
            state.offered = t;

            return this.#updateState(state);
        }

        // Clears the state, less prone to errors than using the offered and wanted
        // properties alone
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

        // Takes the operation ("wanted"/"offered") and returns the size of the
        // respective set of superhero ids. Comodity method
        size(op){
            if(!this.checkOp(op)) throw Error("Invalid operation");
            
            let state = this.#retrieveState();
            return state[op].size;
        }

        // An exchange is complete if the user has selected both an offering
        // and a wanted card
        isComplete(){
            let state = this.#retrieveState();

            return (state.offered.size > 0 && state.wanted.size > 0);
        }

        // Returns a deep copy of the exchangeState in LocalStorage with js Sets to
        // prevent duplicating supercard
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

        // Tries to update the state and returns if it was successful
        // Takes the state from the #retrieveState method
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

        // Tells whether the specified operation is supported
        checkOp(op){
            if(op === "wanted" || op === "offered")
                return true;
            return false;
        }
    }
})(typeof exports === 'undefined'? this['lib']={}: exports);