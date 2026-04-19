const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./LockerSystem.db', (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// User table creation
db.run(`CREATE TABLE IF NOT EXISTS User (  
    userID TEXT PRIMARY KEY,  
    name TEXT,  
    email TEXT,  
    phoneNumber TEXT,  
    password TEXT,  
    role TEXT DEFAULT 'User'  
);`);

// Admin table creation
db.run(`CREATE TABLE IF NOT EXISTS Admin (  
    adminID TEXT PRIMARY KEY,  
    name TEXT,  
    email TEXT,  
    phoneNumber TEXT,  
    password TEXT,  
    role TEXT  
);`);

// Locker table creation
 db.run(`CREATE TABLE IF NOT EXISTS Locker (  
    lockerID INTEGER PRIMARY KEY AUTOINCREMENT,  
    name TEXT,  
    status TEXT,  
    location TEXT  
);`);

// Reservation table creation
db.run(`CREATE TABLE IF NOT EXISTS Reservation (  
    reservationID INTEGER PRIMARY KEY AUTOINCREMENT,  
    userID TEXT,  
    lockerID INTEGER,  
    startTime DATETIME,  
    endTime DATETIME,  
    FOREIGN KEY(userID) REFERENCES User(userID),  
    FOREIGN KEY(lockerID) REFERENCES Locker(lockerID)  
);`);

// Payment table creation
db.run(`CREATE TABLE IF NOT EXISTS Payment (  
    paymentID INTEGER PRIMARY KEY AUTOINCREMENT,  
    reservationID INTEGER UNIQUE,  
    amount REAL,  
    status TEXT,  
    paymentMethod TEXT,  
    paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,  
    FOREIGN KEY(reservationID) REFERENCES Reservation(reservationID)  
);`);

// AccessCode table creation
 db.run(`CREATE TABLE IF NOT EXISTS AccessCode (  
    accessCodeID INTEGER PRIMARY KEY AUTOINCREMENT,  
    reservationID INTEGER,  
    code TEXT,  
    validFrom DATETIME,  
    validTo DATETIME,  
    FOREIGN KEY(reservationID) REFERENCES Reservation(reservationID)  
);`);

module.exports = {
    run: (...args) => new Promise((resolve, reject) =>
        db.run(...args, function(err) {
            if (err) reject(err);
            else resolve(this);
        })
    ),
    get: (...args) => new Promise((resolve, reject) =>
        db.get(...args, (err, row) => err ? reject(err) : resolve(row))
    ),
    all: (...args) => new Promise((resolve, reject) =>
        db.all(...args, (err, rows) => err ? reject(err) : resolve(rows))
    ),
};

