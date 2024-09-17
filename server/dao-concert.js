'use strict';

/* Data Access Object (DAO) module for accessing concerts data */

const db = require('./db');

// To concert object from a record as returned by the DB
const convertConcertFromDbRecord = (dbRecord) => {
    const concert = {};
    concert.ConcertID = dbRecord.ConcertID;
    concert.ConcertName = dbRecord.ConcertName;
    concert.TheaterID = dbRecord.TheaterID;
    concert.AvailableSeats = dbRecord.AvailableSeats;
    return concert;
  }


// This function retrieves the whole list of concerts from the database.
exports.listConcerts = () => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM Concerts';
      db.all(sql, (err, rows) => {
        if (err) { reject(err); }
        const concerts = rows.map((e) => {
          return convertConcertFromDbRecord(e);
        });
        resolve(concerts);
      });
    });
  };

// This function retrieves all the reservations for a user
exports.getReservations = (UserID) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT DISTINCT ConcertID FROM Seats WHERE UserID = ?'; // Distinct to avoid duplicates
      db.all(sql, [UserID], (err, rows) => {
        if (err) {
          reject(err);
        } else if (rows.length === 0) {
          resolve({ message: 'No reservations found' });
        } else {
          // Create the reservations object with the correct data
          const reservations = {
            UserID: UserID,
            Concerts: rows.map( row => row.ConcertID) // Contains the list of ConcertIDs
          };
          resolve(reservations);
        }
      });
    });
  };

  // This function retrieves the concert name given the ConcertID
  exports.getConcertName = (ConcertID) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT ConcertName FROM Concerts WHERE ConcertID = ?';
      db.get(sql, [ConcertID], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.ConcertName);
        }
      });
    });
  };

  // This function retrieves the list of seats occupied for a specific concert
  exports.getOccupiedSeats = (ConcertID) => {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT SeatNumber FROM Seats WHERE ConcertID = ? AND UserID IS NOT NULL'; // If UserID is null, the seat is free
      db.all(sql, [ConcertID], (err, rows) => {
        if (err) {
          reject(err); 
        } else {
          const occupiedSeats = {
            ConcertID: ConcertID,
            Seats: rows.map(row => row.SeatNumber)
          };
          resolve(occupiedSeats);
        }
      });
    });
  };
  
  
  //This function deletes a reservation (REMEMBER: only one reservation for user and concert)
  exports.cancelReservation = (UserID, ConcertID) => {
    return new Promise((resolve, reject) => {
      // Set to NULL the UserID for the seats reserved by the user
      const sqlUpdateSeats = 'UPDATE Seats SET UserID = NULL WHERE UserID = ? AND ConcertID = ?';
      db.run(sqlUpdateSeats, [UserID, ConcertID], function(err) {
        if (err) {
          reject(err);
        } else {
          const seatsCancelled = this.changes;
          if (seatsCancelled === 0) {
            // No reservation was found or it was already cancelled
            resolve({ success: false, message: 'No reservation found or already cancelled.', seatsCancelled: 0 });
          } else {
            // Otherwise update availableSeats counter in the Concerts table
            const sqlUpdateConcerts = 'UPDATE Concerts SET availableSeats = availableSeats + ? WHERE ConcertID = ?'; // Increment available seats
            db.run(sqlUpdateConcerts, [seatsCancelled, ConcertID], function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({
                  success: true, 
                  message: 'Reservation successfully cancelled and available seats updated.',
                  seatsCancelled: seatsCancelled,
                });
              }
            });
          }
        }
      });
    });
  };

  // This function reserves a list seats for a user in a concert
  exports.reserveSeats = (UserID, ConcertID, seatCodes) => {
    return new Promise((resolve, reject) => {
          // Check individual seat availability
          const placeholders = seatCodes.map(() => '?').join(', '); // Create a string of placeholders for the SQL query based on the number of seatCodes  "?, ?, ?"
          const sqlCheckAvailability = `SELECT SeatNumber FROM Seats WHERE ConcertID = ? AND SeatNumber IN (${placeholders}) AND UserID IS NULL`;
          // First check if the seats are all available
          db.all(sqlCheckAvailability, [ConcertID, ...seatCodes], (err, availableSeats) => {
            if (err) {
              reject(err);
            } else {
              // Check if there are any occupied seats among the selected ones (for the blue seat case)
              const availableSeatNumbers = availableSeats.map(seat => seat.SeatNumber); //extract the seat numbers from the availableSeats array
              const occupiedSeats = seatCodes.filter(seat => !availableSeatNumbers.includes(seat)); //Compare the requested list of seats with the availables

              if (occupiedSeats.length > 0) {
                // At least one of the selected seats is already occupied
                resolve({
                  success: false,
                  message: 'Some selected seats are already occupied.',
                  occupiedSeats: occupiedSeats // Restituisce i posti occupati
                });
              } else {
                // All selected seats are available, proceed to reserve them
                const sqlReserveSeats = `UPDATE Seats SET UserID = ? WHERE ConcertID = ? AND SeatNumber IN (${placeholders})`;
                db.run(sqlReserveSeats, [UserID, ConcertID, ...seatCodes], function(err) {
                  if (err) {
                    reject(err);
                  } else {
                    const seatsReserved = this.changes;
                    // After successfully reserving seats, decrement the available seats counter in the Concerts table
                    const sqlDecrementAvailableSeats = `UPDATE Concerts SET availableSeats = availableSeats - ? WHERE ConcertID = ?`;
                    db.run(sqlDecrementAvailableSeats, [seatsReserved, ConcertID], function(err) {
                      if (err) {
                        reject(err);
                      } else {
                        resolve({
                          success: true,
                          message: 'Seats successfully reserved and available seats updated.',
                          seatsReserved: seatsReserved,
                          seatCodes: seatCodes //to save in reservationData
                        });
                      }
                    });
                  }
                });
              }
            }
          });
        });
};

// This function searches for available seats for a concert (First method to reserve seats)
exports.searchSeats = (ConcertID, numSeats) => {
  return new Promise((resolve, reject) => {
    // Check if there are enough seats
   const sqlCheckTotalAvailable = `SELECT AvailableSeats FROM Concerts WHERE ConcertID = ?`;
   db.get(sqlCheckTotalAvailable, [ConcertID], (err, result) => {
     if (err) {
       reject(err);
     } else if (result.AvailableSeats < numSeats) {
       // Not enough seats available
       resolve({
         success: false,
         message: `Not enough seats available. Only ${result.AvailableSeats} left.`,
       });
     } else {
      // Get them in ascending order, giving them less discount
      const sql = `SELECT SeatNumber FROM Seats WHERE ConcertID = ? AND UserID IS NULL LIMIT ?`;
      db.all(sql, [ConcertID, numSeats], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            seats : rows.map(row => row.SeatNumber)}); // List of seats reserved
        }
      });
     }
  });
});
};

  
// Retrieve the size of the concert theater to render map
exports.getConcertSize = (ConcertID) => {
  return new Promise((resolve, reject) => {
    const theaterSql = 'SELECT TheaterID FROM Concerts WHERE ConcertID = ?';
    const seatsSql = 'SELECT Rows, Columns FROM Theaters WHERE TheaterID = ?';
    // First get the TheaterID from the ConcertID
    db.get(theaterSql, [ConcertID], (err, row) => {
      if (err) {
        reject(err);
      } else {
        // Now get the number of rows and columns of the theater
        db.get(seatsSql, [row.TheaterID], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              TheaterID: row.TheaterID,
              Rows: row.Rows,
              Columns: row.Columns
          });
          }
        });
      }
    });
  });
};

// This function retrieves the stats of the seats for a concert
exports.getConcertStats = (ConcertID) => {
  return new Promise((resolve, reject) => {
    // Get the number of available seats
    const sql = 'SELECT AvailableSeats FROM Concerts WHERE ConcertID = ?';
    db.get(sql, [ConcertID], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const availableSeats = row.AvailableSeats;
        // Get the number of occupied seats
        const sqlOccupied = 'SELECT COUNT(*) AS occupied FROM Seats WHERE ConcertID = ? AND UserID IS NOT NULL';
        db.get(sqlOccupied, [ConcertID], (err, row) => {
          if (err) {
            reject(err);
          } else {
            // Calculate the total number of seats
            const occupiedSeats = row.occupied;
            const totalSeats = availableSeats + occupiedSeats;
            resolve({
              availableSeats: availableSeats,
              occupiedSeats: occupiedSeats,
              totalSeats: totalSeats
            });
          }
        });
      }
    });
  });
}
// This function retrieves the reservation for a user in a concert
exports.getReservation = (UserID, ConcertID) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT SeatNumber FROM Seats WHERE UserID = ? AND ConcertID = ?';
    db.all(sql, [UserID, ConcertID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const reservation =  {
          Seats: rows.map(row => row.SeatNumber) // List of reserved seats [10A, 10B, 10C]
        }
        resolve(reservation);
      }
    });
  });
}