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

// --- Create Reservation ---
app.post('/api/reservations', async (req, res) => {
    const { userID, lockerID, startTime, endTime } = req.body;
    const sql = 'INSERT INTO Reservation (userID, lockerID, startTime, endTime) VALUES (?, ?, ?, ?)';
    try {
        await db.run(sql, [userID, lockerID, startTime, endTime]);
        res.status(201).send('Reservation created successfully.');
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

// --- Update Locker Status ---
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

// --- Basic homepage / health route ---
app.get('/', (req, res) => {
    res.send('LockerSystemFinal backend is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
