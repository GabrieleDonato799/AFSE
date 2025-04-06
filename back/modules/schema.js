/**
 * @module front/schema
 * @description Setups the mongodb collections with a validation schema.
 */

const { ObjectId } = require('mongodb');
const { client, DB_NAME } = require('./common.js');

function createDB(){
    createCollections();
}

/**
 * Create the collections and automatically also creates the database if missing.
 * TODO: A way to update the schema without needing to drop the database must be researched.
 */
function createCollections(){
    client.db(DB_NAME).createCollection("users",
        {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    title: "User Object Validation",
                    // album_id is not required as the code doesn't create the user and its album in a single transaction
                    required: [ "nick", "email", "password", "favhero", "balance" ],
                    properties: {
                        nick: {
                            bsonType: "string",
                            description: "'nick' must be a string and is required"
                        },
                        email: {
                            bsonType: "string",
                            description: "'email' must be a string and is required"
                        },
                        password: {
                            bsonType: "string",
                            description: "'password' must be a string and is required"
                        },
                        favhero: {
                            bsonType: "string",
                            description: "'favhero' must be a string and is required"
                        },
                        balance: {
                            bsonType: "int",
                            minimum: 0,
                            maximum: 99999,
                            description: "'balance' must be an integer in [ 0, infinity ] and is required"
                        },
                        album_id: {
                            bsonType: "objectId",
                            description: "'album_id' must be an ObjectId and is NOT required as the code doesn't create the user and its album in a single transaction"
                        },
                    }
                }
            }
        }
    ).catch(err => {if(err.codeName!='NamespaceExists'){console.error(err); process.exit(-1);}});
    client.db(DB_NAME).createCollection("albums",
        {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    title: "Album Object Validation",
                    // user_id is required as the code creates the user first, its album last
                    required: [ "user_id", "supercards" ],
                    properties: {
                        user_id: {
                            bsonType: "objectId",
                            description: "'user_id' must be a ObjectId and is required"
                        },
                        supercards: {
                            bsonType: "array",
                            description: "'supercards' must be an array and is required"
                        },
                    }
                }
            }
        }
    ).catch(err => {if(err.codeName!='NamespaceExists'){console.error(err); process.exit(-1);}});
    client.db(DB_NAME).createCollection("offers",
        {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    title: "Offer Object Validation",
                    required: [ "type", "amount", "title", "price" ],
                    properties: {
                        type: {
                            bsonType: "string",
                            enum: [ "coins", "packets" ],
                            description: "'type' must be either 'coins' or 'packets' and is required"
                        },
                        amount: {
                            bsonType: "int",
                            description: "'amount' must be a int and is required"
                        },
                        title: {
                            bsonType: "string",
                            description: "'title' must be a UNIQUE string and is required. The title will be used by the server servicing the corresponding images."
                        },
                        price: {
                            bsonType: "int",
                            description: "'price' must be an int and is required."
                        }
                    }
                }
            }
        }
    ).catch(err => {if(err.codeName!='NamespaceExists'){console.error(err); process.exit(-1);}});
    addOffers();

    client.db(DB_NAME).createCollection("trades",
        {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    title: "Trades Object Validation",
                    required: [ "offerer", "wanter", "offers", "wants" ],
                    properties: {
                        offerer: {
                            bsonType: "objectId",
                            description: "'offerer' must be a ObjectId and is required"
                        },
                        wanter: {
                            bsonType: [ "objectId", "null" ],
                            description: "'wanter' must be a ObjectId and is required. It is not immediately known so it must be null."
                        },
                        offers: {
                            bsonType: "array",
                            description: "'offers' must be an array and is required"
                        },
                        wants: {
                            bsonType: "array",
                            description: "'wants' must be an array and is required. The title will be used by the server servicing the corresponding images."
                        },
                    }
                }
            }
        }
    ).catch(err => {if(err.codeName!='NamespaceExists'){console.error(err); process.exit(-1);}});

    console.info('MongoDB database and collections with schema exist.');
}

/**
 * Temporary function that adds all the offers for coins and packets.
 */
function addOffers(){
    client.db(DB_NAME).collection("offers").insertMany(
        [
            {
                _id: ObjectId.createFromHexString('000000000000000000000000'),
                title: "Pouch of Coins",
                type: "coins",
                amount: 5,
                price: 1,
            },
            {
                _id: ObjectId.createFromHexString('000000000000000000000001'),
                title: "Bucket of Coins",
                type: "coins",
                amount: 11,
                price: 2,
            },
            {
                _id: ObjectId.createFromHexString('000000000000000000000002'),
                title: "Barrel of Coins",
                type: "coins",
                amount: 24,
                price: 3,
            },
            {
                _id: ObjectId.createFromHexString('000000000000000000000003'),
                title: "Wagon of Coins",
                type: "coins",
                amount: 31,
                price: 4,
            },
            {
                _id: ObjectId.createFromHexString('000000000000000000000004'),
                title: "Mountain of Coins",
                type: "coins",
                amount: 66,
                price: 5,
            },
        ]
    ).catch(err => {
        if(err.code!=11000){
            console.error(err); process.exit(-2)
        }
    }); // 11000 means duplicated entries
}

createDB();