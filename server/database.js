const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

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
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId INTEGER,
      startTime TEXT,
      duration INTEGER,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY (playerId) REFERENCES player(id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create orders table:', err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      techLevelRequired INTEGER,
      cost INTEGER,
      techCode TEXT,
      modifierValue REAL,
      gameEffect TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create technologies table:', err.message);
    } else {
      const techs = JSON.parse(fs.readFileSync(path.join(__dirname, 'technologies.json'), 'utf8'));
      const stmt = db.prepare('INSERT INTO technologies (name, description, techLevelRequired, cost, techCode, modifierValue, gameEffect) VALUES (?, ?, ?, ?, ?, ?, ?)');
      techs.forEach(tech => {
        stmt.run(tech.name, tech.description, tech.techLevelRequired, tech.cost, tech.techCode, tech.modifierValue, tech.gameEffect);
      });
      stmt.finalize();
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS available_technologies (
      playerId INTEGER,
      techId INTEGER,
      techCode TEXT,
      FOREIGN KEY (playerId) REFERENCES player(id),
      FOREIGN KEY (techId) REFERENCES technologies(id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create available_technologies table:', err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS acquired_technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId INTEGER,
      techId INTEGER,
      techCode TEXT,
      acquiredDate TEXT,
      acquiredCost INTEGER,
      FOREIGN KEY (playerId) REFERENCES player(id),
      FOREIGN KEY (techId) REFERENCES technologies(id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create acquired_technologies table:', err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS PlayerProducts (
      playerId INTEGER,
      productId INTEGER,
      FOREIGN KEY (playerId) REFERENCES player(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create PlayerProducts table:', err.message);
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      weight REAL,
      costToBuild INTEGER,
      salesPrice INTEGER,
      imageURL TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create products table:', err.message);
    } else {
      const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
      const stmt = db.prepare('INSERT INTO products (name, description, weight, costToBuild, salesPrice, imageURL) VALUES (?, ?, ?, ?, ?, ?)');
      products.forEach(product => {
        stmt.run(product.name, product.description, product.weight, product.costToBuild, product.salesPrice, product.imageURL);
      });
      stmt.finalize();
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      playerId INTEGER,
      productId INTEGER,
      onHand INTEGER DEFAULT 0,
      damaged INTEGER DEFAULT 0,
      inTransit INTEGER DEFAULT 0,
      FOREIGN KEY (playerId) REFERENCES player(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create inventory table:', err.message);
    }
  });
};

module.exports = { db, initDatabase, dbRun, dbGet, dbAll };