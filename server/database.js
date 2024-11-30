const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'game.db');
const dbDir = path.dirname(dbPath);
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDatabase();
  }
});

const dbRun = (query, params = [], errorMessage = 'Database error') => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        console.error(`${errorMessage}:`, err.message);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

const dbGet = (query, params = [], errorMessage = 'Database error') => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        console.error(`${errorMessage}:`, err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const dbAll = (query, params = [], errorMessage = 'Database error') => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`${errorMessage}:`, err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const initDatabase = () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Failed to initialize database schema:', err.message);
    } else {
      console.log('Database schema initialized.');
    }
  });
};

module.exports = { db, initDatabase, dbRun, dbGet, dbAll };