'use strict';

const express = require('express');
const morgan = require('morgan'); // logging middleware
const cors = require('cors');

const { body, validationResult } = require("express-validator");

const { expressjwt: jwt } = require('express-jwt');

const jwtSecret = 'JhtjwMeRSB83rbYkZpuxJvVAFhrVxmFm4q6Kbvxf8AFpXQJBnZzmmKzvCj1cdyeJ';


//This is used to create the token
const jsonwebtoken = require('jsonwebtoken');
const expireTime = 60; //seconds

// init express
const app = express();
const port = 3002;

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// set-up the middlewares
app.use(morgan('dev'));
app.use(express.json()); // To automatically decode incoming json

// Check token validity
app.use(jwt({
  secret: jwtSecret,
  algorithms: ["HS256"],
  // token from HTTP Authorization: header
})
);

//In case of errors
app.use( function (err, req, res, next) {
  //console.log("DEBUG: error handling function executed");
  console.log(err);
  if (err.name === 'UnauthorizedError') {
    // Example of err content:  {"code":"invalid_token","status":401,"name":"UnauthorizedError","inner":{"name":"TokenExpiredError","message":"jwt expired","expiredAt":"2024-05-23T19:23:58.000Z"}}
    res.status(401).json({ errors: [{  'param': 'Server', 'msg': 'Authorization error', 'path': err.code }] });
  } else {
    next();
  }
} );

//Used to generate the random value in the discount
function getRandomInt(min, max) {
  return Math.random() * (max - min) + min; 
}

/*** APIs ***/

//API to compute the discount
app.post('/api/discount', [
  body('seats', 'Invalid list of seats').isArray({ min: 1 }), //At least one seat
], (req, res) => {
  // Check if validation is ok
  const err = validationResult(req);
  if (!err.isEmpty()) { 
    errList.push(...err.errors.map(e => e.msg));
    return res.status(400).json({errors: errList});
  }
  const authLevel = req.auth.access; //Loyal or not
  const seats = req.body.seats; //List of seats

  // Extract the row numbers and calculate their sum
  let sum = 0;
  for (const seat of seats) {
    const rowNumber = parseInt(seat.match(/\d+/)[0]);  //  "\d+"" is a regular expression that matches one or more digits, "[0]"" is the first match
    sum += rowNumber;
  }
  //DEBUG console.log(sum);
  

  // If the user is not loyal, divide the sum by 3
  if (authLevel != 'Loyal') {
    sum = (sum / 3);
  }


  // Generate a random number between 5 and 20
  const randomValue = getRandomInt(5, 20);
  //DEBUG console.log(randomValue);

  // Calculate the discount
  let discount = Math.round(sum + randomValue);
  //DEBUG console.log(discount);

  // Clip the discount between 5 and 50
  discount = Math.max(5, Math.min(discount, 50));

  // Respond with the calculated discount percentage
  res.json({ discount: discount });
});



// Activate the server
app.listen(port, () => {
  console.log(`Discount server listening at http://localhost:${port}`);
});
