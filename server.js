const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming request data
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files (index.html, dashboard.html, styles.css, app.js) directly
app.use(express.static(__dirname));

// MySQL Database Connection Configuration
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'amadeus',
    database: process.env.DB_NAME || 'Pets_DES'
});

// Connect to MySQL Server
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log(`Connected to MySQL Database: ${process.env.DB_NAME || 'Pets_DES'}`);
});

// LOGIN LOGIC ROUTE
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Query Users table for matching credentials
    const sql = 'SELECT * FROM Users WHERE Username = ? AND Password = ?';

    db.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (results.length > 0) {
            // Credentials match
            res.json({ success: true, message: 'Login successful' });
        } else {
            // Invalid credentials
            res.status(401).json({ success: false, message: 'Invalid Username or Password' });
        }
    });
});

// Start Node.js Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
