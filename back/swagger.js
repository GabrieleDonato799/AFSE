const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});

const doc = {
  info: {
    title: 'Users management',
    description: 'API endpoints to manage the user\'s resources,'
  },
  components: {
    schemas:{
        userSchema:{
          $_id: "e8a8a1086935b255ed5ae2d2",
          $email: "example.mail@example.com",
          $password: "password",
          $album_id: "242f01ed6c9a44b190274cf6",
          $balance: "500",
          $nick: "MyNickName",
        }
    }
  },
  host: 'localhost:3005'
};

const outputFile = './swagger-output.json';
const routes = ['index.js', 'modules/*.js'];

swaggerAutogen(outputFile, routes, doc);
