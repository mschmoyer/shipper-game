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
      techLevelRequired INTEGER,
      cost INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create technologies table:', err.message);
    } else {
      const techs = [
        { name: 'ShipTo Automation', description: 'Automate the process of entering shipping addresses, reducing errors and saving time.', techLevelRequired: 1, cost: 100 },
        { name: 'Automatic Rate Shopping', description: 'Automatically compare shipping rates from different carriers to find the best price.', techLevelRequired: 1, cost: 150 },
        { name: 'Auto Routing', description: 'Automatically route shipments to the most efficient carrier based on destination and delivery time.', techLevelRequired: 1, cost: 200 },
        { name: 'Inventory Management', description: 'Keep track of inventory levels in real-time to avoid stockouts and overstocking.', techLevelRequired: 1, cost: 250 },
        { name: 'Order Tracking', description: 'Provide customers with real-time tracking information for their orders.', techLevelRequired: 1, cost: 300 },
        { name: 'Warehouse Automation', description: 'Automate warehouse operations to increase efficiency and reduce labor costs.', techLevelRequired: 2, cost: 400 },
        { name: 'Predictive Analytics', description: 'Use data analytics to predict demand and optimize inventory levels.', techLevelRequired: 2, cost: 450 },
        { name: 'Customer Relationship Management', description: 'Manage customer interactions and improve customer satisfaction.', techLevelRequired: 2, cost: 500 },
        { name: 'Shipping Label Printing', description: 'Automatically print shipping labels for orders, saving time and reducing errors.', techLevelRequired: 2, cost: 550 },
        { name: 'Returns Management', description: 'Streamline the process of handling returns and exchanges.', techLevelRequired: 2, cost: 600 },
        { name: 'Advanced Analytics', description: 'Gain deeper insights into business performance with advanced analytics tools.', techLevelRequired: 3, cost: 700 },
        { name: 'Multi-Channel Integration', description: 'Integrate with multiple sales channels to manage orders from different platforms.', techLevelRequired: 3, cost: 750 },
        { name: 'Dynamic Pricing', description: 'Adjust prices in real-time based on demand and competition.', techLevelRequired: 3, cost: 800 },
        { name: 'Supply Chain Optimization', description: 'Optimize the supply chain to reduce costs and improve efficiency.', techLevelRequired: 3, cost: 850 },
        { name: 'AI-Powered Customer Support', description: 'Use AI to provide instant customer support and resolve issues quickly.', techLevelRequired: 3, cost: 900 }
      ];
      const stmt = db.prepare('INSERT INTO technologies (name, description, techLevelRequired, cost) VALUES (?, ?, ?, ?)');
      techs.forEach(tech => {
        stmt.run(tech.name, tech.description, tech.techLevelRequired, tech.cost);
      });
      stmt.finalize();
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS available_technologies (
      playerId INTEGER,
      techId INTEGER,
      FOREIGN KEY (playerId) REFERENCES player(id),
      FOREIGN KEY (techId) REFERENCES technologies(id)
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create available_technologies table:', err.message);
    }
  });
};

module.exports = { db, initDatabase, dbRun, dbGet, dbAll };