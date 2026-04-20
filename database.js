const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('C:/Users/rosem/Documents/LockerSystemFinal/LockerSystem.db', (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Always run migration for 'status' column if needed
db.all("PRAGMA table_info(Reservation);", [], (err, rows) => {
    if (rows && !rows.some(col => col.name === 'status')) {
        db.run("ALTER TABLE Reservation ADD COLUMN status TEXT DEFAULT 'Active';", err2 => {
            if (err2) console.error("Failed to add Reservation.status column:", err2.message);
            else console.log("Reservation.status column added!");
        });
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

// Add a hardcoded admin user if it doesn't exist
db.get(`SELECT COUNT(*) as count FROM Admin WHERE email = ?`, ['admin@uta.edu'], (err, row) => {
    if (err) {
        console.error('Error checking for admin user:', err.message);
    } else if (row.count === 0) {
        db.run(
            `INSERT INTO Admin (adminID, name, email, phoneNumber, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                'admin-uuid-001',    // Can be any unique string or uuid
                'Admin User',
                'admin@uta.edu',
                '1234567890',
                '123',
                'Admin'
            ],
            (err2) => {
                if (err2) {
                    console.error('Error inserting default admin user:', err2.message);
                } else {
                    console.log('Default admin user created.');
                }
            }
        );
    }
});

// Locker table creation
db.run(`CREATE TABLE IF NOT EXISTS Locker (  
    lockerID INTEGER PRIMARY KEY AUTOINCREMENT,  
    name TEXT,  
    status TEXT,  
    location TEXT  
);`);

// Seed example lockers for 'Business' and 'Pickard' if table is empty
db.get(`SELECT COUNT(*) as count FROM Locker`, [], (err, row) => {
    if (err) {
        console.error('Error checking for example lockers:', err.message);
    } else if (row.count === 0) {
        const stmt = db.prepare(`INSERT INTO Locker (name, status, location) VALUES (?, ?, ?)`);
        // Business lockers
        stmt.run('B1', 'Available', 'Business');
        stmt.run('B2', 'Available', 'Business');
        stmt.run('B3', 'Available', 'Business');
        // Pickard lockers
        stmt.run('P1', 'Available', 'Pickard');
        stmt.run('P2', 'Available', 'Pickard');
        stmt.run('P3', 'Available', 'Pickard');
        stmt.finalize();
        console.log('Example lockers for Business and Pickard seeded.');
    }
});

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
