const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const db = require('../database');

// --- User Registration ---
app.post('/api/register', async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const sql = 'INSERT INTO User (userID, name, email, phoneNumber, password, role) VALUES (?, ?, ?, ?, ?, ?)';
    try {
        const userID = uuidv4();
        await db.run(sql, [userID, name, email, phoneNumber, password, 'User']);
        res.status(201).send('User registered successfully.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- User Login ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM User WHERE email = ? AND password = ?';
    try {
        const user = await db.get(sql, [email, password]);
        if (user) {
            res.status(200).json({ id: user.userID, email: user.email });
        } else {
            res.status(401).send('Invalid credentials.');
        }
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Admin Login ---
app.post('/api/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM Admin WHERE email = ? AND password = ?';
    try {
        const admin = await db.get(sql, [email, password]);
        if (admin) {
            res.status(200).json({ id: admin.adminID, email: admin.email });
        } else {
            res.status(401).send('Invalid admin credentials.');
        }
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Get current active reservation for a user (by userID) ---
app.get('/api/user/current-reservation', async (req, res) => {
    const { userID } = req.query;
    if (!userID) return res.status(400).send('userID required');
    try {
        // Find reservation where endTime is in future and status is Active or null (null for legacy rows)
        const now = new Date().toISOString();
        const reservation = await db.get(
            `SELECT * FROM Reservation 
             WHERE userID = ? 
             AND startTime <= ? 
             AND endTime >= ? 
             AND (status IS NULL OR status = 'Active')
             ORDER BY endTime DESC LIMIT 1`,
            [userID, now, now]
        );
        res.json(reservation || {});
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Get All Lockers (grouped by location for frontend compatibility) ---
app.get('/api/lockers', async (req, res) => {
    try {
        const lockers = await db.all('SELECT * FROM Locker');
        // Group by location if you want to match your JS
        const lockerData = {};
        lockers.forEach(locker => {
            if (!lockerData[locker.location]) lockerData[locker.location] = [];
            lockerData[locker.location].push({
                id: locker.lockerID,
                name: locker.name || `Locker ${locker.lockerID}`,
                status: locker.status || 'Available'
            });
        });
        res.json(lockerData);
    } catch (error) {
        res.status(500).send('Error reading lockers: ' + error.message);
    }
});

// --- Create Reservation and set locker to Occupied ---
app.post('/api/reservations', async (req, res) => {
    const { userID, lockerID, startTime, endTime } = req.body;
    const sql = 'INSERT INTO Reservation (userID, lockerID, startTime, endTime, status) VALUES (?, ?, ?, ?, ?)';
    try {
        const result = await db.run(sql, [userID, lockerID, startTime, endTime, 'Active']);
        await db.run('UPDATE Locker SET status = ? WHERE lockerID = ?', ['Occupied', lockerID]);
        res.status(201).json({ reservationID: result.lastID });
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- End Reservation (free locker and update reservation record) ---
app.post('/api/reservations/end', async (req, res) => {
    const { lockerID, reservationID } = req.body;
    try {
        if (reservationID) {
            // If your Reservation table has a status field. If not, this is a no-op.
            await db.run('UPDATE Reservation SET status = ? WHERE reservationID = ?', ['Ended', reservationID]);
        }
        await db.run('UPDATE Locker SET status = ? WHERE lockerID = ?', ['Available', lockerID]);
        res.status(200).send('Reservation ended and locker marked available.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Payment Endpoint ---
app.post('/api/pay', async (req, res) => {
    const { reservationID, amount, status, paymentMethod } = req.body;
    const sql = 'INSERT INTO Payment (reservationID, amount, status, paymentMethod) VALUES (?, ?, ?, ?)';
    try {
        await db.run(sql, [
            reservationID, 
            amount, 
            status || 'Paid', 
            paymentMethod || 'Unknown'
        ]);
        res.status(201).send('Payment processed successfully.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Update Locker Status (manual override, not necessary for normal reservation flow) ---
app.post('/api/locker/updateStatus', async (req, res) => {
    const { lockerID, status } = req.body;
    if (!lockerID || !status) return res.status(400).send('Missing lockerID or status');
    const sql = 'UPDATE Locker SET status = ? WHERE lockerID = ?';
    try {
        await db.run(sql, [status, lockerID]);
        res.status(200).send('Locker status updated.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Admin: All Users List (for report panel) ---
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.all('SELECT userID, name, email, phoneNumber FROM User');
        res.json(users);
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Admin: All Reservations and Locker/User Info (for report panel) ---
app.get('/api/admin/reservations', async (req, res) => {
    try {
        const reservations = await db.all(`
            SELECT Reservation.*, User.name AS userName, Locker.name AS lockerName, Locker.location 
            FROM Reservation 
            LEFT JOIN User ON Reservation.userID = User.userID 
            LEFT JOIN Locker ON Reservation.lockerID = Locker.lockerID
        `);
        res.json(reservations);
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// --- Basic homepage / health route ---
app.get('/', (req, res) => {
    res.send('LockerSystemFinal backend is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
