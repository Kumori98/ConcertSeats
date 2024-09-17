const express = require('express');
const morgan = require('morgan');                                  // logging middleware
const { check, validationResult } = require('express-validator'); // validation middleware
const cors = require('cors');

const jsonwebtoken = require('jsonwebtoken');

const jwtSecret = 'JhtjwMeRSB83rbYkZpuxJvVAFhrVxmFm4q6Kbvxf8AFpXQJBnZzmmKzvCj1cdyeJ';
const expireTime = 60; //seconds

const concertDao = require('./dao-concert'); // module for accessing the films table in the DB
const userDao = require('./dao-users'); // module for accessing the user table in the DB

// DOMPurify to sanitize user input
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// init express and setup middlewares
const app = new express();
app.use(morgan('dev'));
app.use(express.json());
const port = 3001;

/** Set up and enable Cross-Origin Resource Sharing (CORS) **/
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));


/*** Passport ***/

/** Authentication-related imports **/
const passport = require('passport');                              // authentication middleware
const LocalStrategy = require('passport-local');                   // authentication strategy (username and password)

/** Set up authentication strategy to search in the DB a user with a matching password.
 * The user object will contain other information extracted by the method userDao.getUser (i.e., id, username, name).
 **/
passport.use(new LocalStrategy(async function verify(username, password, callback) {
  const user = await userDao.getUser(username, password)
  if(!user)
    return callback(null, false, 'Incorrect username or password');  
    
  return callback(null, user); // NOTE: user info in the session (all fields returned by userDao.getUser, i.e, id, username, name)
}));

// Serializing in the session the user object given from LocalStrategy(verify).
passport.serializeUser(function (user, callback) { // this user is id + username + name 
  callback(null, user);
});

// Starting from the data in the session, we extract the current (logged-in) user.
passport.deserializeUser(function (user, callback) { // this user is id + email + name 
  // if needed, we can do extra check here (e.g., double check that the user is still in the database, etc.)
  // e.g.: return userDao.getUserById(id).then(user => callback(null, user)).catch(err => callback(err, null));

  return callback(null, user); // this will be available in req.user
});

/** Creating the session */
const session = require('express-session');

app.use(session({
  secret: "rnkh9HAZbKTDby3Cfbza", //Random string used for session ID generation
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: app.get('env') === 'production' ? true : false},
}));


app.use(passport.authenticate('session'));


/** Defining authentication verification middleware **/
const isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({error: 'Not authorized'});
}

/*** Utility Functions ***/

// This function is used to format express-validator errors as strings
const errorFormatter = ({ location, msg, param, value, nestedErrors }) => {
  return `${location}[${param}]: ${msg}`;
};


/*** Concert APIs ***/

const purifyConcert = Concert => Object.assign({}, Concert, {ConcertID: DOMPurify.sanitize(Concert.ConcertID)});

const purifyConcerts = Concerts => Concerts.map(e => purifyConcert(e));


// 1. Retrieve the list of all the available concerts (not authenticated)
app.get('/api/concerts',
  (req, res) => {
    // get concerts
    concertDao.listConcerts()
      .then(concerts => res.json(purifyConcerts(concerts)))
      .catch((err) => res.status(500).json(err)); // always return a json and an error message
  }
);

// 2. Retrieve Reservations for a specific user (authenticated)
app.get('/api/reservations', isLoggedIn,
  async (req, res) => {
    const errors = validationResult(req).formatWith(errorFormatter); 
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors ); 
    }
    try {
      const result = await concertDao.getReservations(req.user.UserID);
      if (result.error)   
        res.status(404).json(result);
      else
        res.json(result); // return the list of codes of concerts
    } catch (err) {
      res.status(500).end();
    }
  }
);

// 3. Retrieve occupied seats for a concert (not authenticated)
app.get('/api/concerts/:ConcertID', [ check('ConcertID').isInt({min: 1}) ], 
  async (req, res) => {

    // Is there any validation error?
    const errors = validationResult(req).formatWith(errorFormatter); 
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors ); 
    }
    try {
      const result = await concertDao.getOccupiedSeats(req.params.ConcertID);
      if (result.error)   
        res.status(404).json(result);
      else
        res.json(result);
    } catch (err) {
      res.status(500).end();
    }
  }
);

// 4. Cancel a reservation recieving the ConcertID for a specific user (authenticated)
app.put('/api/deleteReservation/', [ check('ConcertID').isInt({min: 1}) ], isLoggedIn,
  async (req, res) => {
    const errors = validationResult(req).formatWith(errorFormatter); 
    if (!errors.isEmpty()) {
      return res.status(422).json( errors.errors ); 
    }
    try {
      const result = await concertDao.cancelReservation(req.user.UserID, req.body.ConcertID);
      if (result.error)
        res.status(404).json(result);
      else
        res.json(result); 
    } catch (err) {
      res.status(503).json({ error: `Database error during cancellation${req.user.id}` });
    }
  }
);

// 5. Create a Reservation for a specific user (authenticated)
app.put('/api/createReservation/', isLoggedIn,
  [
    check('ConcertID').isInt({min: 1}),
    check('seats').isArray(), // Checks if the seats field is an array
    check('seats.*').isString() // Each element of the array must be a string
  ],
  async (req, res) => {
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors);
    }
    try {
      const result = await concertDao.reserveSeats(req.user.UserID, req.body.ConcertID, req.body.seats);
      if (result.error) {
        res.status(404).json(result);
      } else {
        res.json(result); // check dao for different cases
      }
    } catch (err) {
      res.status(503).json({ error: `Database error during the reservation of seats: ${err.message}` });
    }
  }
);

//6. Retrieve the size of the concert based on the theater (not authenticated)
app.get('/api/size/:ConcertID', [ check('ConcertID').isInt({min: 1}) ], async (req, res) => {
  const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors);
    }
  try{
    const result = await concertDao.getConcertSize(req.params.ConcertID);
    if (result.error) {
      res.status(404).json(result);
    } else {
      res.json(result);
    }
  } catch (err) {
    res.status(503).json({ error: `Database error during size retrieval: ${err.message}` });
    }
  }
);

//7. Retrieve the stats of the seats for a concert 
app.get('/api/stats/:ConcertID', [ check('ConcertID').isInt({min: 1}) ], async (req, res) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(422).json(errors.errors);
  }
  try {
    const result = await concertDao.getConcertStats(req.params.ConcertID);
    if (result.error) {
      res.status(404).json(result);
    } else {
      res.json(result);
    }
  } catch (err) {
    res.status(503).json({ error: `Database error during stats retrieval: ${err.message}` });
  }
});

//8. Retrieve the reservation for a specific user in a concert (authenticated)
app.get('/api/reservation/:ConcertID', [ check('ConcertID').isInt({min: 1}) ], isLoggedIn, async (req, res) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(422).json(errors.errors);
  }
  try {
    const result = await concertDao.getReservation(req.user.id, req.params.ConcertID);
    if (result.error) {
      res.status(404).json(result); // check dao for different cases
    } else {
      res.json(result);
    }
  } catch (err) {
    res.status(503).json({ error: `Database error during reservation retrieval: ${err.message}` });
  }
});

//8. Search for available seats in a concert (to use reservation method 1)
app.post('/api/searchSeats', isLoggedIn, [
  check('ConcertID').isInt({min: 1}),
  check('numSeats').isInt({min: 1})
]
, async (req, res) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(422).json(errors.errors);
  }
  try {
    const result = await concertDao.searchSeats(req.body.ConcertID, req.body.numSeats);
    if (result.error) {
      res.status(404).json(result);
    } else {
      res.json(result);
    }
  } catch (err) {
    res.status(503).json({ error: `Database error during search: ${err.message}` });
  }
});

//9. Retrieve the name of a concert based on the ConcertID
app.get('/api/getConcertName/:ConcertID', [ check('ConcertID').isInt({min: 1}) ],
  async (req, res) => {
    const errors = validationResult(req).formatWith(errorFormatter);
    if (!errors.isEmpty()) {
      return res.status(422).json(errors.errors);
    }
    try {
      const result = await concertDao.getConcertName(req.params.ConcertID);
      if (!result) {
        res.status(404).json({ error: "Concert not found" });
      } else {
        res.json({ ConcertName: result });
      }
    } catch (err) {
      res.status(503).json({ error: `Concert not found: ${req.params.id}` });
    }
});

/*** Users APIs ***/

// POST /api/sessions 
// This route is used for performing login.
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', (err, user, info) => { 
    if (err) 
      return next(err);
      if (!user) {
        // display wrong login messages
        return res.status(401).json({ error: info});
      }
      // success, perform the login and extablish a login session
      req.login(user, (err) => {
        if (err)
          return next(err);
        
        // req.user contains the authenticated user, we send all the user info back
        // this is coming from userDao.getUser() in LocalStratecy Verify Fn
        return res.json(req.user);
      });
  })(req, res, next);
});

// GET /api/sessions/current
// This route checks whether the user is logged in or not.
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.status(200).json(req.user);}
  else
    res.status(401).json({error: 'Not authenticated'});
});

// DELETE /api/session/current
// This route is used for loggin out the current user.
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});

/*** Token ***/

// GET /api/auth-token
app.get('/api/auth-token', isLoggedIn, (req, res) => {
  let authLevel = req.user.Level;
  console.log('DEBUG: authLevel: '+authLevel);

  const payloadToSign = { access: authLevel, authId: req.user.UserID };
  const jwtToken = jsonwebtoken.sign(payloadToSign, jwtSecret, {expiresIn: expireTime});

  res.json({token: jwtToken, authLevel: authLevel});  // authLevel is just for debug. Anyway it is in the JWT payload
});

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
