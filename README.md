# AFSE (Superheroes Trading Cards Album)
Course: Programmazione Web e Mobile, A.A. 23-24

Student: Gabriele Donato, matriculation number: 31884A

<img src="https://img.shields.io/badge/license-MIT-green" alt="">

## Installation
```sh
git clone https://github.com/GabrieleDonato799/AFSE.git
cd AFSE/back
npm install
```

Generating the swagger and executing the application server for the development:
```sh
npm run dev
```

Executing the application server in the deployment configuration:
```sh
npm run deploy
```

In the file "back/.env" put the secret for the JWS token generation, the Marvel API public and private keys and the MongoDB Atlas URI for the application server to connect to the database.
```.env
JWT_SECRET_KEY=<key of at least 256 bit>
MARVEL_PUBLIC_API_KEY=<public api key goes here>
MARVEL_PRIVATE_API_KEY=<private api key goes here>
PASSWORD_MIN_LENGTH=<user's password lenght goes here>
```

Generation of the JSDoc source code documentation:
```sh
npm run jsdoc
```
The documentation can be found under the folder "docs".

## Where to find the remaining documentation
The remaining documentation has been submitted directly to the professor by using the university computer science department upload system.