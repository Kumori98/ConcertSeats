'use strict';

/* Data Access Object (DAO) module for accessing users data */

const db = require('./db');
const crypto = require('crypto');

// This function returns user's information given its id.
exports.getUserById = (UserID) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Users WHERE UserID=?';
    db.get(sql, [UserID], (err, row) => {
      if (err)
        reject(err);
      else if (row === undefined)
        resolve({ error: 'User not found.' });
      else {
        const user = { UserID: row.UserID, Name: row.Name, Level: row.Level};
        resolve(user);
      }
    });
  });
};

// This function is used at log-in time to verify username and password.
exports.getUser = (Name, Password) => {
  return new Promise((resolve, reject) => { 
    const sql = 'SELECT * FROM Users WHERE Name=?';
    db.get(sql, [Name], (err, row) => {
      if (err) {
        reject(err);
      } else if (row === undefined) {
        resolve(false);
      }
      else {
        const user = { UserID: row.UserID, Name: row.Name, Level: row.Level};
        // Check the hashes with an async call, this operation may be CPU-intensive (and we don't want to block the server)
        crypto.scrypt(Password, row.Salt, 32, function (err, hashedPassword) { // WARN: it is 64 and not 32 (as in the week example) in the DB
          if (err) reject(err);
          if (!crypto.timingSafeEqual(Buffer.from(row.Hash, 'hex'), hashedPassword)) // WARN: it is hash and not password (as in the week example) in the DB
            resolve(false);
          else
            resolve(user);
        });
      }
    });
  });
};


