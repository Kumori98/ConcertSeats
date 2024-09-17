const SERVER_URL = 'http://localhost:3001/api/';
const SERVER_URL2 = 'http://localhost:3002/api/';

function getJson(httpResponsePromise) {
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        if (response.ok) {
          response.json()
            .then(json => resolve(json))
            .catch(err => reject({ error: "Cannot parse server response" }));
        } else {
          response.json()
            .then(obj => reject(obj))
            .catch(err => reject({ error: "Cannot parse server response" }));
        }
      })
      .catch(err => reject({ error: "Cannot communicate" })); // connection error
  });
}

// Retrieve the list of concerts
const getConcerts = async () => {
  return getJson(fetch(SERVER_URL + 'concerts'))
    .then(json => {
      return json.map((concert) => {
        const clientConcert = {
          ConcertID: concert.ConcertID,
          ConcertName: concert.ConcertName,
          TheaterID: concert.TheaterID,
          AvailableSeats: concert.AvailableSeats
        };
        return clientConcert;
      });
    }).catch(err => {
      return { error: "Cannot get concerts" };
    });
};

// Retrieve the name of a concert
const getConcertName = async (concertID) => {
  return getJson(fetch(SERVER_URL + 'getConcertName/' + concertID))
    .then(json => {
      return { ConcertName: json.ConcertName };
    }).catch(err => {
      return { error: "Cannot get concert name" };
    });
};

// Retrieve all the concerts reserved by the user
const getReservations = async () => {
  return getJson(
    fetch(SERVER_URL + 'reservations', {
      method: 'GET',
      credentials: 'include'
    })
  ).then(json => {
    const clientReservation = {
      UserID: json.UserID,
      Concerts: json.Concerts
    };
    return clientReservation;
  }).catch(err => {
    return { error: "Cannot get reservations" };
  });
};

// Retrieve all the seats occupied in a concert (no need Auth)
const getOccupiedSeats = (concertId) => {
  return getJson(
    fetch(SERVER_URL + 'concerts/' + concertId, {
      method: 'GET',
    })
  ).then(json => {
    const occupiedSeats = {
      ConcertID: json.ConcertID,
      OccupiedSeats: json.Seats
    };
    return occupiedSeats;
  }).catch(err => {
    return { error: "Cannot get occupied seats" };
  });
};

// Get the list of seats occupied (reservation) in a concert for a specific user
const getReservation = (concertID) => {
  return getJson(
    fetch(SERVER_URL + 'reservation/' + concertID, {
      method: 'GET',
      credentials: 'include'
    })
  ).then(json => {
    const reservation = {
      Seats: json.Seats
    };
    return reservation;
  }).catch(err => {
    return { error: "Cannot get reservation" };
  });
};

// First method to make a reservation
const searchSeats = (concertID, numSeats) => {
  return getJson(
    fetch(SERVER_URL + 'searchSeats', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ConcertID: concertID, numSeats: numSeats })
    })
  ).then(json => {
    if (json.success) {
      const availableSeats = json.seats;
      return createReservation(concertID, availableSeats)
        .then(reservationResult => {
          if (reservationResult.success) {
            return reservationResult;
          } else {
            console.error('Reservation failed:', reservationResult.message);
            return { error: 'Reservation failed: ' + reservationResult.message };
          }
        })
        .catch(err => {
          console.error('Error during reservation:', err);
          return { error: 'Error during reservation' };
        });
    } else {
      console.error('Not enough seats available:', json.message);
      return { error: json.message };
    }
  }).catch(err => {
    console.error('Error searching for seats:', err);
    return { error: 'Error searching for seats' };
  });
};

// This function deletes a reservation for a specific concert
const cancelReservation = (concertID) => {
  return getJson(
    fetch(SERVER_URL + 'deleteReservation/', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ConcertID: concertID })
    })
  ).then(json => {
    const clientResult = {
      success: json.success,
      message: json.message,
      seatsCancelled: json.seatsCancelled
    };
    return clientResult;
  }).catch(err => {
    return { error: "Cannot cancel reservation" };
  });
};

// This function creates a reservation (specific list of seats) for a specific concert
const createReservation = async (concertID, seats) => {
  try {
    const reservationResponse = await getJson(
      fetch(SERVER_URL + 'createReservation/', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ConcertID: concertID, seats: seats })
      })
    );
    if (reservationResponse.success) {
      return {
        success: true,
        message: 'Reservation successful',
        seatsReserved: reservationResponse.seatsReserved,
        seatCodes: reservationResponse.seatCodes
      };
    } else {
      return { 
        succes: false,
        occupiedSeats: reservationResponse.occupiedSeats
       };
    }
  } catch (err) {
    return { error: 'Error during reservation or discount' };
  }
};

// This function retrieves size of theater based on ConcertID
const getTheaterSize = (concertID) => {
  return getJson(
    fetch(SERVER_URL + 'size/' + concertID)
  ).then(json => {
    const clientTheater = {
      TheaterID: json.TheaterID,
      Rows: json.Rows,
      Columns: json.Columns
    };
    return clientTheater;
  }).catch(err => {
    return { error: "Cannot get theater size" };
  });
};

// This function retrieves stats of the available, occupied, and total seats for a specific concert
const getStats = (concertID) => {
  return getJson(
    fetch(SERVER_URL + 'stats/' + concertID)
  ).then(json => {
    const clientStats = {
      availableSeats: json.availableSeats,
      occupiedSeats: json.occupiedSeats,
      totalSeats: json.totalSeats
    };
    return clientStats;
  }).catch(err => {
    return { error: "Cannot get stats" };
  });
};

/*** Authentication functions ***/

// Log in
const logIn = async (credentials) => {
  return getJson(fetch(SERVER_URL + 'sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // forward authentication cookie
    body: JSON.stringify(credentials),
  }));
};

// Get user info
const getUserInfo = async () => {
  return getJson(fetch(SERVER_URL + 'sessions/current', {
    credentials: 'include' // forward authentication cookie
    })
  )
};

// Log out
const logOut = async () => {
  return getJson(fetch(SERVER_URL + 'sessions/current', {
    method: 'DELETE',
    credentials: 'include' // forward authentication cookie
  }));
};

async function getAuthToken() {
  return getJson(fetch(SERVER_URL + 'auth-token', {
    credentials: 'include' // forward authentication cookie
  }));
}

// Get discount for a specific reservation
async function getDiscount(authToken, seats) {
  return getJson(fetch(SERVER_URL2 + 'discount', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seats: seats }),
  }));
}

const API = {
  getConcerts, getReservations, getOccupiedSeats, cancelReservation, createReservation,
  getTheaterSize, getStats, logIn, getUserInfo, logOut, getAuthToken, getDiscount, getReservation, searchSeats, getConcertName
};

export default API;
