const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
  } else {
    console.log('Connected to the in-memory SQLite database.');
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

const initDatabase = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS player (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      progress INTEGER DEFAULT 0,
      isShipping BOOLEAN DEFAULT 0,
      businessName TEXT DEFAULT 'Fun Shipping Co.',
      money INTEGER DEFAULT 0,
      techPoints INTEGER DEFAULT 0,
      techLevel INTEGER DEFAULT 1,
      ordersShipped INTEGER DEFAULT 0,
      totalMoneyEarned INTEGER DEFAULT 0,
      name TEXT,
      email TEXT,
      apiKey TEXT,
      apiSecret TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create table:', err.message);
    } else {
      db.run(`INSERT INTO player (progress, isShipping, businessName, money, techPoints, techLevel, ordersShipped, totalMoneyEarned, name, email, apiKey, apiSecret) VALUES (0, 0, 'Fun Shipping Co.', 0, 0, 1, 0, 0, '', '', '', '')`);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS active_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId INTEGER,
      startTime TEXT,
      duration INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create active_orders table:', err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      techLevelRequired INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create technologies table:', err.message);
    } else {
      const techs = [
        { name: 'Tech 1-1', description: 'Description for Tech 1-1', techLevelRequired: 1 },
        { name: 'Tech 1-2', description: 'Description for Tech 1-2', techLevelRequired: 1 },
        { name: 'Tech 1-3', description: 'Description for Tech 1-3', techLevelRequired: 1 },
        { name: 'Tech 1-4', description: 'Description for Tech 1-4', techLevelRequired: 1 },
        { name: 'Tech 1-5', description: 'Description for Tech 1-5', techLevelRequired: 1 },
        { name: 'Tech 2-1', description: 'Description for Tech 2-1', techLevelRequired: 2 },
        { name: 'Tech 2-2', description: 'Description for Tech 2-2', techLevelRequired: 2 },
        { name: 'Tech 2-3', description: 'Description for Tech 2-3', techLevelRequired: 2 },
        { name: 'Tech 2-4', description: 'Description for Tech 2-4', techLevelRequired: 2 },
        { name: 'Tech 2-5', description: 'Description for Tech 2-5', techLevelRequired: 2 },
        { name: 'Tech 3-1', description: 'Description for Tech 3-1', techLevelRequired: 3 },
        { name: 'Tech 3-2', description: 'Description for Tech 3-2', techLevelRequired: 3 },
        { name: 'Tech 3-3', description: 'Description for Tech 3-3', techLevelRequired: 3 },
        { name: 'Tech 3-4', description: 'Description for Tech 3-4', techLevelRequired: 3 },
        { name: 'Tech 3-5', description: 'Description for Tech 3-5', techLevelRequired: 3 }
      ];
      const stmt = db.prepare('INSERT INTO technologies (name, description, techLevelRequired) VALUES (?, ?, ?)');
      techs.forEach(tech => {
        stmt.run(tech.name, tech.description, tech.techLevelRequired);
      });
      stmt.finalize();
    }
  });
};

module.exports = { db, initDatabase, dbRun, dbGet };