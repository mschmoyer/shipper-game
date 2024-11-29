// Filename: server/server.js

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the in-memory SQLite database.');
    initDatabase();
  }
});

// Initialize the database schema
const initDatabase = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS shipping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      progress INTEGER DEFAULT 0,
      isShipping BOOLEAN DEFAULT 0
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create table:', err.message);
    } else {
      // Insert initial state
      db.run(`INSERT INTO shipping (progress, isShipping) VALUES (0, 0)`);
    }
  });
};

// API routes
app.get('/api/shipping', (req, res) => {
  db.get('SELECT * FROM shipping WHERE id = 1', (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Failed to retrieve shipping data.' });
    } else {
      res.json(row);
    }
  });
});

app.post('/api/start-shipping', (req, res) => {
  db.run('UPDATE shipping SET isShipping = 1, progress = 0 WHERE id = 1', function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to start shipping.' });
    } else {
      res.json({ message: 'Shipping started successfully.' });
    }
  });
});

app.post('/api/update-progress', (req, res) => {
  const { progress } = req.body;
  db.run('UPDATE shipping SET progress = ? WHERE id = 1', [progress], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to update progress.' });
    } else {
      res.json({ message: 'Progress updated successfully.' });
    }
  });
});

app.post('/api/complete-shipping', (req, res) => {
  db.run('UPDATE shipping SET isShipping = 0, progress = 100 WHERE id = 1', function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to complete shipping.' });
    } else {
      res.json({ message: 'Shipping completed successfully.' });
    }
  });
});

// Serve the React frontend
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Close the database on exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Failed to close the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
