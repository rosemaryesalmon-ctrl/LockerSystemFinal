const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Middleware
app.use(bodyParser.json());

// Database connection setup (assumed already done)
const db = require('./db');

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    const sql = 'INSERT INTO User (username, password, email) VALUES (?, ?, ?)';
    try {
        await db.query(sql, [username, password, email]);
        res.status(201).send('User registered successfully.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM User WHERE username = ? AND password = ?';
    try {
        const [user] = await db.query(sql, [username, password]);
        if (user) {
            res.status(200).send('Login successful.');
        } else {
            res.status(401).send('Invalid credentials.');
        }
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// Retrieve lockers endpoint
app.get('/api/lockers', async (req, res) => {
    const sql = 'SELECT * FROM Locker';
    try {
        const lockers = await db.query(sql);
        res.status(200).json(lockers);
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// Create reservation endpoint
app.post('/api/reservations', async (req, res) => {
    const { userId, lockerId, reservationDate } = req.body;
    const sql = 'INSERT INTO Reservation (userId, lockerId, reservationDate) VALUES (?, ?, ?)';
    try {
        await db.query(sql, [userId, lockerId, reservationDate]);
        res.status(201).send('Reservation created successfully.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// Payment processing endpoint
app.post('/api/pay', async (req, res) => {
    const { userId, amount } = req.body;
    const sql = 'INSERT INTO Payment (userId, amount) VALUES (?, ?)';
    try {
        await db.query(sql, [userId, amount]);
        res.status(201).send('Payment processed successfully.');
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// Access code retrieval endpoint
app.get('/api/access-codes', async (req, res) => {
    const sql = 'SELECT * FROM AccessCode';
    try {
        const accessCodes = await db.query(sql);
        res.status(200).json(accessCodes);
    } catch (error) {
        res.status(500).send('Database error: ' + error.message);
    }
});

// Admin functionality might extend here...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});