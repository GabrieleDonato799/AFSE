var url_backend = "http://localhost:3005"

// A memoized function never repeats the same calculations twice
function memoize(fn) {
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
function checkPassword(pwd){
    pwd = String(pwd);

    if(pwd.length < 8) return false;
    if(pwd.includes("")) return false;
}

// Uses the binary search algorithm, then approximates
// to the higher value in the array.
// Returns the index of next value in the array bigger than the input value,
// if all the values are smaller, it returns the index of the biggest of them. 
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

module.exports = {memoize, checkPassword, binarySearchRight};